// Resumen del negocio: junta las reglas B para la pantalla de Resumen (funciones puras, probadas en resumen.test.ts).

import { dentroDe, diasDelPeriodo, type Periodo } from '@/lib/fechas';
import { impuestoDelRegimen, impuestosEstimados, type ParametrosImpuestos, type RegimenTributario } from '@/lib/impuestos';
import {
  cajaTotal,
  estadoDeResultados,
  porCobrarYPagar,
  puntoDeEquilibrio,
  saludDelNegocio,
  type CuentaNegocio,
  type MovNegocio,
  type Transferencia,
} from '@/lib/negocio';
import { costoDeVentas, type VentaParaCosto } from '@/lib/pos';
import { variacionPorcentual } from '@/lib/personal';
import type { Venta } from '@/pos/datos';

import type { Configuracion } from './datos';

/** Lo que una venta del POS aporta al costo de lo vendido (B5). */
export function paraCosto(v: Pick<Venta, 'fecha' | 'estado' | 'lineas'>): VentaParaCosto {
  return {
    fecha: v.fecha,
    costoConocido: v.lineas.reduce((t, l) => t + (l.costo ?? 0) * l.cantidad, 0),
    montoLibre: v.lineas.filter((l) => l.costo === null).reduce((t, l) => t + l.total, 0),
    devuelta: v.estado === 'devuelta',
  };
}

export function calcularResumen(
  d: { cuentas: CuentaNegocio[]; movimientos: MovNegocio[]; traslados: Transferencia[]; configuracion: Configuracion; ventas?: Venta[] },
  periodo: Periodo,
  anterior: Periodo,
  tributario: { parametros: ParametrosImpuestos | null; regimen: RegimenTributario | null },
) {
  const costoPorcentaje = d.configuracion.costo_porcentaje ?? 0;
  const delPeriodo = d.movimientos.filter((m) => dentroDe(m.fecha, periodo));
  // B5 · Lo vendido en el POS va a su costo real; lo registrado a mano, con el % de costo del negocio.
  const ventasPos = (d.ventas ?? []).map(paraCosto);
  const costoReal = (p: Periodo) =>
    costoDeVentas({
      ventasManuales: d.movimientos.filter((m) => m.tipo === 'venta' && !m.venta && dentroDe(m.fecha, p)).reduce((t, m) => t + m.monto, 0),
      ventasPos,
      costoPorcentaje,
      periodo: p,
    });
  const antes = estadoDeResultados(delPeriodo, { costoPorcentaje, costoReal: costoReal(periodo) });
  // B7: impuestos estimados del período según el régimen (si hay parámetros del año).
  const impuestos = tributario.parametros
    ? impuestosEstimados(
        { ventas: antes.ventas, operativa: antes.operativa, diasPeriodo: diasDelPeriodo(periodo), grupo: d.configuracion.grupo_actividad ?? 2, icaPorMil: d.configuracion.ica_por_mil },
        tributario.parametros,
      )
    : null;
  const resultados = estadoDeResultados(delPeriodo, { costoPorcentaje, costoReal: costoReal(periodo), impuestos: impuestos ? impuestoDelRegimen(impuestos, tributario.regimen) : 0 });
  const previos = estadoDeResultados(
    d.movimientos.filter((m) => dentroDe(m.fecha, anterior)),
    { costoPorcentaje, costoReal: costoReal(anterior) },
  );
  const caja = cajaTotal(d.cuentas, d.movimientos, d.traslados);
  const pendientes = porCobrarYPagar(
    d.movimientos,
    {
      deudasIniciales: (d.configuracion.deuda_proveedores ?? 0) + (d.configuracion.prestamos ?? 0),
      porCobrarInicial: d.configuracion.por_cobrar_inicial ?? 0,
    },
    caja,
  );
  const fijosMes = d.configuracion.fijos_mes ?? resultados.fijos;
  const gastosMes = fijosMes + resultados.variables;
  const equilibrio = puntoDeEquilibrio({ fijosMes, costoPorcentaje, variables: resultados.variables, ventas: resultados.ventas }).ventasEquilibrio;
  const retiros = delPeriodo.filter((m) => m.tipo === 'retiro').reduce((s, m) => s + m.monto, 0);
  return {
    resultados,
    impuestos,
    delPeriodo,
    caja,
    ...pendientes,
    gastosMes,
    mesesCaja: gastosMes > 0 ? caja / gastosMes : null,
    equilibrio,
    salud: saludDelNegocio({ neta: resultados.neta, operativa: resultados.operativa, caja, gastosMes, ventas: resultados.ventas, equilibrio, porCobrar: pendientes.porCobrar, retiros }),
    variacionVentas: variacionPorcentual(resultados.ventas, previos.ventas),
  };
}
