// Análisis del mes y topes (docs/reglas-de-calculo.md, A2, A3 y A8). Funciones puras.

import { armarFecha, partes, type Fecha, type Periodo } from './fechas';
import {
  estadoTope,
  gustosSobreIngresos,
  mesesDelPeriodo,
  proyeccionCierre,
  tasaAhorro,
  variacionPorcentual,
  type EstadoTope,
  type Movimiento,
} from './personal';

export type MesSerie = { mes: string; gasto: number; ingreso: number };

/** Gráfica: gastos e ingresos de cada uno de los últimos `cuantos` meses (el actual hasta hoy). Mes como "AAAA-MM". */
export function serieMensual(movimientos: Movimiento[], hoy: Fecha, cuantos = 6): MesSerie[] {
  const { anio, mes } = partes(hoy);
  const meses: MesSerie[] = [];
  for (let i = cuantos - 1; i >= 0; i--) {
    const total = anio * 12 + (mes - 1) - i;
    meses.push({ mes: armarFecha(Math.floor(total / 12), (total % 12) + 1, 1).slice(0, 7), gasto: 0, ingreso: 0 });
  }
  const porMes = new Map(meses.map((m) => [m.mes, m]));
  for (const m of movimientos) {
    if (m.fecha > hoy) continue;
    const fila = porMes.get(m.fecha.slice(0, 7));
    if (!fila) continue;
    if (m.tipo === 'gasto') fila.gasto += m.monto;
    else fila.ingreso += m.monto;
  }
  return meses;
}

export type EstadoDeTope = { gastado: number; tope: number; estado: EstadoTope; porcentaje: number };

/** A3 · Estado de cada categoría con gasto o con tope, ajustando el tope a los meses del período. */
export function estadosDeTopes(
  gastoPorCategoria: Record<string, number>,
  topesMensuales: Record<string, number>,
  periodo: Periodo,
  hoy: Fecha,
  alerta: { alertaActiva: boolean; umbral: number },
): Record<string, EstadoDeTope> {
  const meses = mesesDelPeriodo(periodo, hoy);
  const categorias = new Set([...Object.keys(gastoPorCategoria), ...Object.keys(topesMensuales)]);
  const resultado: Record<string, EstadoDeTope> = {};
  for (const c of categorias) {
    const gastado = gastoPorCategoria[c] ?? 0;
    const tope = (topesMensuales[c] ?? 0) * meses;
    resultado[c] = { gastado, tope, ...estadoTope(gastado, tope, alerta) };
  }
  return resultado;
}

/** A2 · Gasto de cada categoría contra el mes anterior, de la más grande a la más chica. */
export function comparacionPorCategoria(actual: Record<string, number>, anterior: Record<string, number>) {
  const categorias = new Set([...Object.keys(actual), ...Object.keys(anterior)]);
  return [...categorias]
    .map((categoria) => {
      const a = actual[categoria] ?? 0;
      const b = anterior[categoria] ?? 0;
      return { categoria, actual: a, anterior: b, variacion: variacionPorcentual(a, b) };
    })
    .sort((x, y) => Math.max(y.actual, y.anterior) - Math.max(x.actual, x.anterior));
}

export const LIMITE_SHOPPING = 10;
export const LIMITE_GUSTOS = 30;
export const META_AHORRO = 20;

export type Consejo =
  | { tipo: 'ritmoAlto'; proyeccion: number; anterior: number }
  | { tipo: 'ritmoBien'; proyeccion: number }
  | { tipo: 'shoppingAlto'; porcentaje: number }
  | { tipo: 'gustosAltos'; porcentaje: number }
  | { tipo: 'gustosBien'; porcentaje: number }
  | { tipo: 'ahorroBajo'; tasa: number }
  | { tipo: 'ahorroBien'; tasa: number }
  | { tipo: 'hormiga'; cantidad: number; total: number }
  | { tipo: 'topesSuperados'; cantidad: number };

/** A8 · Consejos del mes. Devuelve códigos con sus números; la pantalla los convierte en frases. */
export function consejosDelMes(d: {
  gastoMes: number;
  ingresosMes: number;
  gastoPorCategoria: Record<string, number>;
  gastoMesAnterior: number;
  hoy: { diaDeHoy: number; diasDelMes: number };
  hormiga: { cantidad: number; total: number; avisar: boolean };
  topesSuperados: number;
}): Consejo[] {
  const consejos: Consejo[] = [];
  const proyeccion = Math.round(proyeccionCierre(d.gastoMes, d.hoy));

  if (d.gastoMesAnterior > 0) {
    consejos.push(
      proyeccion > d.gastoMesAnterior ? { tipo: 'ritmoAlto', proyeccion, anterior: d.gastoMesAnterior } : { tipo: 'ritmoBien', proyeccion },
    );
  }

  if (d.ingresosMes > 0) {
    const shopping = Math.round(((d.gastoPorCategoria.shopping ?? 0) / d.ingresosMes) * 100);
    if (shopping > LIMITE_SHOPPING) consejos.push({ tipo: 'shoppingAlto', porcentaje: shopping });

    const gustos = gustosSobreIngresos(d.gastoPorCategoria, d.ingresosMes) ?? 0;
    consejos.push(gustos > LIMITE_GUSTOS ? { tipo: 'gustosAltos', porcentaje: gustos } : { tipo: 'gustosBien', porcentaje: gustos });

    const tasa = tasaAhorro(d.ingresosMes, d.gastoMes) ?? 0;
    consejos.push(tasa < META_AHORRO ? { tipo: 'ahorroBajo', tasa } : { tipo: 'ahorroBien', tasa });
  }

  if (d.hormiga.avisar) consejos.push({ tipo: 'hormiga', cantidad: d.hormiga.cantidad, total: d.hormiga.total });
  if (d.topesSuperados > 0) consejos.push({ tipo: 'topesSuperados', cantidad: d.topesSuperados });

  return consejos;
}

/**
 * A2 · ¿Este gasto hizo cruzar el aviso del tope (umbral %) o el tope completo?
 * Solo avisa una vez por cruce: si ya estaba por encima antes del gasto, no vuelve a avisar.
 */
export function cruceDeTope(d: { gastadoAntes: number; monto: number; tope: number; umbral: number }): 'tope' | 'umbral' | null {
  if (d.tope <= 0 || d.monto <= 0) return null;
  const antes = d.gastadoAntes / d.tope;
  const despues = (d.gastadoAntes + d.monto) / d.tope;
  if (antes < 1 && despues >= 1) return 'tope';
  if (antes < d.umbral / 100 && despues >= d.umbral / 100) return 'umbral';
  return null;
}
