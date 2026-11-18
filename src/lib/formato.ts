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

/**
 * Monto corto para tarjetas pequeñas: 1.758.341 → "1,76M", 338.000 → "338K".
 * `separadorMiles` es el del país: con "." el decimal es ","; con "," el decimal es ".".
 */
export function formatearCorto(valor: number, separadorMiles: '.' | ',' = '.'): string {
  const signo = valor < 0 ? '-' : '';
  const abs = Math.abs(valor);
  const decimal = separadorMiles === '.' ? ',' : '.';
  if (abs >= 1_000_000) return `${signo}${(abs / 1_000_000).toFixed(2).replace('.', decimal)}M`;
  if (abs >= 1_000) return `${signo}${Math.round(abs / 1_000)}K`;
  return `${signo}${Math.round(abs)}`;
}
