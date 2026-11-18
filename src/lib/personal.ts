// Reglas de finanzas personales (docs/reglas-de-calculo.md, sección A). Funciones puras, sin redondeos intermedios.

import { dentroDe, diasDelPeriodo, esMesCompletoOActual, type Fecha, type Periodo } from './fechas';

export type TipoMovimiento = 'gasto' | 'ingreso';

export type Movimiento = {
  id: string;
  fecha: Fecha;
  tipo: TipoMovimiento;
  monto: number;
  /** Id de la categoría. */
  categoria: string;
  descripcion?: string | null;
};

export type Totales = { gasto: number; ingreso: number; gastoPorCategoria: Record<string, number> };

/** A1 · Gasto e ingreso del período, y gasto por categoría. */
export function totalesDelPeriodo(movimientos: Movimiento[], periodo: Periodo): Totales {
  const totales: Totales = { gasto: 0, ingreso: 0, gastoPorCategoria: {} };
  for (const m of movimientos) {
    if (!dentroDe(m.fecha, periodo)) continue;
    if (m.tipo === 'gasto') {
      totales.gasto += m.monto;
      totales.gastoPorCategoria[m.categoria] = (totales.gastoPorCategoria[m.categoria] ?? 0) + m.monto;
    } else {
      totales.ingreso += m.monto;
    }
  }
  return totales;
}

/** A2 · Variación % = redondear((actual − anterior) / anterior × 100). Si el anterior es 0, no hay porcentaje. */
export function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** A3 · Meses del período: 1 si es un mes; si es un rango libre, redondear(días / 30,44, 1 decimal), mínimo 1. */
export function mesesDelPeriodo(periodo: Periodo, hoy: Fecha): number {
  if (esMesCompletoOActual(periodo, hoy)) return 1;
  return Math.max(1, Math.round((diasDelPeriodo(periodo) / 30.44) * 10) / 10);
}

/** A3 · Tope del período = tope mensual × meses del período. */
export function topeDelPeriodo(topeMensual: number, periodo: Periodo, hoy: Fecha): number {
  return topeMensual * mesesDelPeriodo(periodo, hoy);
}

export type EstadoTope = 'sinTope' | 'superado' | 'cuidado' | 'normal';

/** A3 · "Superado" si uso > 100%; "Cuidado" si la alerta está activa y uso ≥ umbral; si no, el porcentaje. */
export function estadoTope(
  gastado: number,
  tope: number,
  alerta: { alertaActiva: boolean; umbral: number },
): { estado: EstadoTope; porcentaje: number } {
  if (tope <= 0) return { estado: 'sinTope', porcentaje: 0 };
  const uso = gastado / tope;
  const porcentaje = Math.round(uso * 100);
  if (uso > 1) return { estado: 'superado', porcentaje };
  if (alerta.alertaActiva && uso * 100 >= alerta.umbral) return { estado: 'cuidado', porcentaje };
  return { estado: 'normal', porcentaje };
}

/** A6 · Tasa mensual equivalente = (1 + EA)^(1/12) − 1. La tasa EA llega en porcentaje (28 = 28%). */
export function tasaMensual(tasaEA: number): number {
  return Math.pow(1 + tasaEA / 100, 1 / 12) - 1;
}

/** A6 · Intereses del mes ≈ saldo × tasa mensual. */
export function interesesDelMes(saldo: number, tasaEA: number): number {
  return saldo * tasaMensual(tasaEA);
}

/** A6 · Prioridad: la deuda con saldo > 0 y mayor tasa (método avalancha). */
export function deudaPrioritaria<T extends { saldo: number; tasaEA: number }>(deudas: T[]): T | null {
  return deudas.filter((d) => d.saldo > 0).sort((a, b) => b.tasaEA - a.tasaEA)[0] ?? null;
}

/** A6 · Abonar nunca deja el saldo negativo. */
export function abonarDeuda(saldo: number, abono: number): number {
  return Math.max(0, saldo - abono);
}

/** A7 · Patrimonio = activos + ahorrado en metas − deudas. */
export function patrimonio(p: { activos: number; ahorradoEnMetas: number; deudas: number }): number {
  return p.activos + p.ahorradoEnMetas - p.deudas;
}

/** A8 · Proyección de cierre = gastado / día de hoy × días del mes. */
export function proyeccionCierre(gastado: number, hoy: { diaDeHoy: number; diasDelMes: number }): number {
  return (gastado / hoy.diaDeHoy) * hoy.diasDelMes;
}

/** A8 · Tasa de ahorro = redondear((ingresos − gastos) / ingresos × 100). Sin ingresos no hay tasa. */
export function tasaAhorro(ingresos: number, gastos: number): number | null {
  if (ingresos <= 0) return null;
  return Math.round(((ingresos - gastos) / ingresos) * 100);
}

/** Categorías que cuentan como "gustos" en la regla 50/30/20. */
export const CATEGORIAS_GUSTOS = ['shopping', 'comida', 'salidas'];

/** A8 · Gustos (shopping + comida fuera + salidas) / ingresos, en porcentaje. La regla 50/30/20 sugiere ≤ 30%. */
export function gustosSobreIngresos(gastoPorCategoria: Record<string, number>, ingresos: number): number | null {
  if (ingresos <= 0) return null;
  const gustos = CATEGORIAS_GUSTOS.reduce((suma, c) => suma + (gastoPorCategoria[c] ?? 0), 0);
  return Math.round((gustos / ingresos) * 100);
}

export const LIMITE_HORMIGA = 25_000;

/** A8 · Gastos hormiga: gastos menores de 25.000 en el período; se avisa si hay 3 o más. */
export function gastosHormiga(movimientos: Movimiento[], periodo: Periodo) {
  const hormiga = movimientos.filter((m) => m.tipo === 'gasto' && m.monto < LIMITE_HORMIGA && dentroDe(m.fecha, periodo));
  return { cantidad: hormiga.length, total: hormiga.reduce((s, m) => s + m.monto, 0), avisar: hormiga.length >= 3 };
}

/**
 * Consejo del período: la categoría con más gasto y su parte del total.
 * Si pasa su tope (ajustado a los meses del período), cuánto ahorraría bajándola al tope.
 */
export function consejoDelPeriodo(
  gastoPorCategoria: Record<string, number>,
  topesMensuales: Record<string, number>,
  meses: number,
): { categoria: string; porcentaje: number; tope: number | null; ahorro: number | null } | null {
  const total = Object.values(gastoPorCategoria).reduce((s, v) => s + v, 0);
  if (total <= 0) return null;
  const [categoria, gastado] = Object.entries(gastoPorCategoria).sort((a, b) => b[1] - a[1])[0];
  const topeMensual = topesMensuales[categoria] ?? 0;
  const tope = topeMensual > 0 ? topeMensual * meses : null;
  return {
    categoria,
    porcentaje: Math.round((gastado / total) * 100),
    tope: tope !== null && gastado > tope ? tope : null,
    ahorro: tope !== null && gastado > tope ? gastado - tope : null,
  };
}

/** Lista de movimientos agrupada por día (del más reciente al más antiguo) con el total de gastos de cada día. */
export function agruparPorDia(movimientos: Movimiento[]): { fecha: Fecha; totalGastos: number; movimientos: Movimiento[] }[] {
  const porFecha = new Map<Fecha, Movimiento[]>();
  for (const m of [...movimientos].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))) {
    porFecha.set(m.fecha, [...(porFecha.get(m.fecha) ?? []), m]);
  }
  return [...porFecha.entries()].map(([fecha, lista]) => ({
    fecha,
    totalGastos: lista.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0),
    movimientos: lista,
  }));
}
