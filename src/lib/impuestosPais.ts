// B13 · Impuestos según el país. Funciones puras.
// Colombia tiene el cálculo completo (SIMPLE, ordinario, persona natural, calendario DIAN).
// En los demás países: el impuesto a las ventas (IVA, IGV, ITBMS…) con su tarifa general,
// y un % sobre la utilidad que pone la persona (se lo pregunta a su contador).
// Tarifas generales 2026: VALIDAR antes de lanzar en cada país.

export type CodigoImpuesto = 'iva' | 'igv' | 'itbms' | 'icms' | 'salesTax';

type Datos = { impuesto: CodigoImpuesto; tasa: number | null };

/** Impuesto a las ventas de cada país y su tarifa general (null: depende del estado o del producto). */
export const IMPUESTOS_PAIS: Record<string, Datos> = {
  CO: { impuesto: 'iva', tasa: 19 },
  MX: { impuesto: 'iva', tasa: 16 },
  AR: { impuesto: 'iva', tasa: 21 },
  CL: { impuesto: 'iva', tasa: 19 },
  PE: { impuesto: 'igv', tasa: 18 },
  EC: { impuesto: 'iva', tasa: 15 },
  PA: { impuesto: 'itbms', tasa: 7 },
  BR: { impuesto: 'icms', tasa: null },
  ES: { impuesto: 'iva', tasa: 21 },
  US: { impuesto: 'salesTax', tasa: null },
};

export function impuestoDelPais(pais: string): Datos {
  return IMPUESTOS_PAIS[pais] ?? IMPUESTOS_PAIS.CO;
}

/**
 * Tarifa del impuesto a las ventas que usa el negocio:
 * la que puso la persona; si no, la del año (Colombia, desde el servidor); si no, la general del país; si no se sabe, 0.
 */
export function tasaVentas(pais: string, propia?: number | null, delAnio?: number | null): number {
  if (typeof propia === 'number' && propia >= 0) return propia;
  if (pais === 'CO' && typeof delAnio === 'number') return delAnio;
  return impuestoDelPais(pais).tasa ?? 0;
}

/** D6 · Cuánto de un precio con el impuesto incluido es impuesto: 119.000 al 19% → 19.000. */
export function impuestoIncluido(total: number, tasa: number): number {
  if (tasa <= 0) return 0;
  return Math.round((total * tasa) / (100 + tasa));
}

/** B13 · Fuera de Colombia: impuesto estimado = utilidad operativa (si es positiva) × el % que puso la persona. */
export function impuestoSobreUtilidad(operativa: number, tasa: number | null | undefined): number {
  if (!tasa || tasa <= 0) return 0;
  return Math.round((Math.max(0, operativa) * tasa) / 100);
}
