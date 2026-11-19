// C11 · Etiquetas con código de barras para imprimir (PDF). Funciones puras: Code 128 (lo leen todas las pistolas
// y la cámara) dibujado como SVG, y la hoja de etiquetas en HTML.

/** Anchos (barra, espacio, barra…) de los 107 símbolos de Code 128; el último es el de parada. */
const PATRONES = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const INICIO_B = 104;
const PARADA = 106;

/** Code 128-B: los símbolos del código (inicio, datos, control, parada). Solo caracteres ASCII 32–126. */
export function simbolosCode128(texto: string): number[] {
  const datos = [...texto].map((c) => {
    const v = c.charCodeAt(0) - 32;
    if (v < 0 || v > 94) throw new Error('caracterInvalido');
    return v;
  });
  const control = (INICIO_B + datos.reduce((s, v, i) => s + v * (i + 1), 0)) % 103;
  return [INICIO_B, ...datos, control, PARADA];
}

/** Los anchos de barras y espacios (en módulos) del código completo. */
export function anchosCode128(texto: string): number[] {
  return simbolosCode128(texto).flatMap((s) => [...PATRONES[s]].map(Number));
}

/** SVG del código de barras (con zona en blanco a los lados). */
export function svgCode128(texto: string, alto = 50): string {
  const anchos = anchosCode128(texto);
  const margen = 10;
  let x = margen;
  const barras: string[] = [];
  anchos.forEach((w, i) => {
    if (i % 2 === 0) barras.push(`<rect x="${x}" y="0" width="${w}" height="${alto}"/>`);
    x += w;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + margen} ${alto}" preserveAspectRatio="none" style="width:100%;height:${alto}px" fill="#000">${barras.join('')}</svg>`;
}

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export type Etiqueta = { nombre: string; detalle: string | null; precio: string; codigo: string };

/** Hoja de etiquetas (3 por fila, tamaño carta/A4) lista para imprimir o guardar en PDF. */
export function htmlEtiquetas(etiquetas: Etiqueta[], negocio: string): string {
  const celdas = etiquetas
    .map(
      (e) => `<div class="e"><div class="n">${escapar(e.nombre)}</div>${e.detalle ? `<div class="d">${escapar(e.detalle)}</div>` : ''}<div class="p">${escapar(e.precio)}</div>${svgCode128(e.codigo)}<div class="c">${escapar(e.codigo)}</div><div class="m">${escapar(negocio)}</div></div>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page{margin:10mm}body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.e{border:1px dashed #999;border-radius:2mm;padding:3mm;text-align:center;page-break-inside:avoid}
.n{font-weight:800;font-size:11pt}.d{font-size:9pt;color:#444}.p{font-weight:800;font-size:13pt;margin:1mm 0}
.c{font-family:monospace;font-size:9pt;letter-spacing:1px}.m{font-size:7pt;color:#777;margin-top:1mm}
</style></head><body><div class="g">${celdas}</div></body></html>`;
}
