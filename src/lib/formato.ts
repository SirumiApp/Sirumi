const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Pesos colombianos sin decimales y con punto de miles: 1250000 → "$ 1.250.000".
 * Redondea al peso más cercano. Los negativos quedan "-$ 5.000".
 */
export function formatearPesos(valor: number): string {
  const redondeado = Math.round(valor);
  const absoluto = Math.abs(redondeado)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${redondeado < 0 ? '-' : ''}$ ${absoluto}`;
}

/** Fecha corta en español: 2026-11-15 → "15 nov 2026". */
export function formatearFecha(fecha: Date): string {
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}
