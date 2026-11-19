import { periodoIvaDe, vencimientos, ivaPorPagar, type PeriodoIva } from '@/lib/calendarioTributario';
import { diasDelMes, hoyEn, partes, sumarDias } from '@/lib/fechas';
import { impuestoIncluido } from '@/lib/impuestosPais';
import { useNegocio } from '@/negocio/contexto';

import { useTributario } from './ganchos';
import { perfilTributario } from './perfil';

/** B12b · IVA por pagar del negocio (null si no cobra IVA): lo cobrado en el período en curso y el anterior sin vencer. */
export function useIvaPorPagar() {
  const { negocio, ventas, movimientos, parametros } = useNegocio();
  const { colombia, tasaVentas } = useTributario();
  if (!negocio?.configuracion.responsable_iva) return null;
  const hoy = hoyEn();
  // Lo cobrado: el IVA de las ventas del POS y el que va dentro de las ventas registradas a mano (D6).
  const ivas = [
    ...ventas.filter((v) => v.estado !== 'devuelta').map((v) => ({ fecha: v.fecha, iva: v.iva })),
    ...movimientos.filter((m) => m.tipo === 'venta' && !m.venta).map((m) => ({ fecha: m.fecha, iva: impuestoIncluido(m.monto, tasaVentas) })),
  ];
  const perfil = perfilTributario(negocio);
  const tipo: PeriodoIva = colombia && perfil.regimen === 'simple' ? 'anual' : perfil.periodoIva;
  const vence = (p: { desde: string; hasta: string }) => {
    if (!colombia) return null;
    const v = vencimientos(perfil, sumarDias(p.hasta, 1), sumarDias(p.hasta, 75), parametros?.calendario).find(
      (x) => ['ivaBimestral', 'ivaCuatrimestral', 'ivaAnualSimple'].includes(x.obligacion) && `${x.periodo.desde}-01` === p.desde,
    );
    if (!v) return null;
    if (v.fecha) return v.fecha;
    // Sin el dígito del NIT: hasta el último día del mes en que vence.
    const { anio, mes } = partes(`${v.mes}-01`);
    return `${v.mes}-${String(diasDelMes(anio, mes)).padStart(2, '0')}`;
  };
  return { ...ivaPorPagar(ivas, hoy, tipo, vence), tipo, periodo: periodoIvaDe(hoy, tipo) };
}
