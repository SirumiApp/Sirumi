// Lector mínimo de Excel (.xlsx): abre el archivo (es un zip), toma la primera hoja y devuelve sus filas.
// Suficiente para extractos bancarios: textos, números y fechas (como número de Excel). No lee el .xls viejo.

import { strFromU8, unzipSync } from 'fflate';

const entidades: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decodificar(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (todo, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return entidades[e] ?? todo;
  });
}

/** Texto de un <si> o <is>: puede venir partido en varios <t>. */
function textoDe(xml: string): string {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodificar(m[1])).join('');
}

/** "C12" → 2 (columna C, empezando en 0). */
function indiceColumna(ref: string): number {
  const letras = ref.replace(/\d+/g, '');
  return [...letras].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;
}

/** Devuelve las filas de la primera hoja: textos como string y números como number. Lanza 'noEsExcel' si no puede abrirlo. */
export function leerXlsx(bytes: Uint8Array): (string | number)[][] {
  let archivos: Record<string, Uint8Array>;
  try {
    archivos = unzipSync(bytes);
  } catch {
    throw new Error('noEsExcel');
  }
  const compartidos = archivos['xl/sharedStrings.xml'] ? [...strFromU8(archivos['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoDe(m[1])) : [];
  // La primera hoja según el libro (si no, sheet1).
  let ruta = 'xl/worksheets/sheet1.xml';
  const libro = archivos['xl/workbook.xml'] ? strFromU8(archivos['xl/workbook.xml']) : '';
  const rels = archivos['xl/_rels/workbook.xml.rels'] ? strFromU8(archivos['xl/_rels/workbook.xml.rels']) : '';
  const primera = libro.match(/<sheet\b[^>]*r:id="([^"]+)"/);
  if (primera) {
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${primera[1]}"`));
    const destino = rel?.match(/Target="([^"]+)"/)?.[1];
    if (destino) ruta = destino.startsWith('/') ? destino.slice(1) : `xl/${destino.replace(/^\.\//, '')}`;
  }
  const hoja = archivos[ruta];
  if (!hoja) throw new Error('noEsExcel');
  const xml = strFromU8(hoja);
  const filas: (string | number)[][] = [];
  for (const fila of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    // Excel no guarda las filas vacías: se respeta el número de fila para no correr las demás.
    const numero = Number(fila[1].match(/\br="(\d+)"/)?.[1] ?? filas.length + 1);
    while (filas.length < numero - 1) filas.push([]);
    const celdas: (string | number)[] = [];
    for (const c of (fila[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const contenido = c[2] ?? '';
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const tipo = attrs.match(/\bt="([^"]+)"/)?.[1];
      const v = contenido.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let valor: string | number = '';
      if (tipo === 's' && v !== undefined) valor = compartidos[Number(v)] ?? '';
      else if (tipo === 'inlineStr') valor = textoDe(contenido);
      else if (tipo === 'str' || tipo === 'e') valor = v !== undefined ? decodificar(v) : '';
      else if (tipo === 'b') valor = v === '1' ? 'TRUE' : 'FALSE';
      else if (v !== undefined) valor = Number.isFinite(Number(v)) ? Number(v) : decodificar(v);
      const i = ref ? indiceColumna(ref) : celdas.length;
      while (celdas.length < i) celdas.push('');
      celdas[i] = valor;
    }
    filas.push(celdas);
  }
  return filas;
}
