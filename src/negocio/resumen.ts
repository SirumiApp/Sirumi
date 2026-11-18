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
import { variacionPorcentual } from '@/lib/personal';

import type { Configuracion } from './datos';

export function calcularResumen(
  d: { cuentas: CuentaNegocio[]; movimientos: MovNegocio[]; traslados: Transferencia[]; configuracion: Configuracion },
  periodo: Periodo,
  anterior: Periodo,
  tributario: { parametros: ParametrosImpuestos | null; regimen: RegimenTributario | null },
) {
  const costoPorcentaje = d.configuracion.costo_porcentaje ?? 0;
  const delPeriodo = d.movimientos.filter((m) => dentroDe(m.fecha, periodo));
  const antes = estadoDeResultados(delPeriodo, { costoPorcentaje });
  // B7: impuestos estimados del período según el régimen (si hay parámetros del año).
  const impuestos = tributario.parametros
    ? impuestosEstimados(
        { ventas: antes.ventas, operativa: antes.operativa, diasPeriodo: diasDelPeriodo(periodo), grupo: d.configuracion.grupo_actividad ?? 2, icaPorMil: d.configuracion.ica_por_mil },
        tributario.parametros,
      )
    : null;
  const resultados = estadoDeResultados(delPeriodo, { costoPorcentaje, impuestos: impuestos ? impuestoDelRegimen(impuestos, tributario.regimen) : 0 });
  const previos = estadoDeResultados(
    d.movimientos.filter((m) => dentroDe(m.fecha, anterior)),
    { costoPorcentaje },
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
