// Exportar datos (CSV) y utilidades de Ajustes. Funciones puras.

import type { CodigoError } from './validacion';

export type FilaCsv = { fecha: string; tipo: string; categoria: string; descripcion: string; monto: number };

/** Texto seguro para una celda de CSV: entre comillas si hace falta y sin fórmulas escondidas para Excel. */
function celda(valor: string): string {
  let texto = valor ?? '';
  // Una celda que empieza con = + - @ podría ejecutarse como fórmula al abrirla en Excel.
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Movimientos en formato CSV (separado por comas, filas con \r\n). Los títulos llegan traducidos. */
export function movimientosACsv(filas: FilaCsv[], titulos: Record<keyof FilaCsv, string>): string {
  const encabezado = [titulos.fecha, titulos.tipo, titulos.categoria, titulos.descripcion, titulos.monto].map(celda).join(',');
  const cuerpo = filas.map((f) => [f.fecha, f.tipo, celda(f.categoria), celda(f.descripcion), String(Math.round(f.monto))].join(','));
  return [encabezado, ...cuerpo].join('\r\n');
}

/** Documento con solo los últimos 4 dígitos a la vista: "••••4567". */
export function enmascararDocumento(numero: string | null | undefined): string | null {
  if (!numero) return null;
  return `••••${numero.slice(-4)}`;
}

export const LARGO_MAXIMO_CATEGORIA = 24;

const comparable = (texto: string) =>
  texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Nombre de una categoría nueva o renombrada: no vacío, no repetido, máximo 24 letras. */
export function validarNombreCategoria(nombre: string, existentes: string[]): CodigoError | null {
  const limpio = nombre.trim();
  if (!limpio) return 'categoriaVacia';
  if (limpio.length > LARGO_MAXIMO_CATEGORIA) return 'categoriaLarga';
  if (existentes.some((e) => comparable(e) === comparable(limpio))) return 'categoriaRepetida';
  return null;
}
