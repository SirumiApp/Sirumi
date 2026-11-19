// D10 · Contar la caja (arqueo): lo que hay en efectivo contra lo que la app dice que debería haber. Funciones puras.

import type { TipoNegocio } from './negocio';

/** Billetes y monedas de Colombia, de mayor a menor. */
export const DENOMINACIONES_CO = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000, 500, 200, 100, 50] as const;

/** Total contado billete por billete: { 50000: 3, 2000: 4 } → 158.000. */
export function totalDenominaciones(conteo: Record<number, number>): number {
  return Object.entries(conteo).reduce((s, [valor, n]) => s + Number(valor) * Math.max(0, Math.floor(n || 0)), 0);
}

export type EstadoArqueo = 'cuadra' | 'sobra' | 'falta';

/** Diferencia = contado − esperado. Positiva: sobra; negativa: falta. */
export function resultadoArqueo(esperado: number, contado: number): { diferencia: number; estado: EstadoArqueo } {
  const diferencia = Math.round(contado) - Math.round(esperado);
  return { diferencia, estado: diferencia === 0 ? 'cuadra' : diferencia > 0 ? 'sobra' : 'falta' };
}

/**
 * Ajuste para que la caja cuadre: si falta, un gasto variable ("Faltante de caja");
 * si sobra, una venta ("Sobrante de caja": casi siempre es una venta que no se registró). Si cuadra, nada.
 */
export function ajusteDeArqueo(diferencia: number): { tipo: TipoNegocio; monto: number } | null {
  if (diferencia === 0) return null;
  return diferencia < 0 ? { tipo: 'variable', monto: -diferencia } : { tipo: 'venta', monto: diferencia };
}
