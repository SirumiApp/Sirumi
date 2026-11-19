// B9 · Importar el extracto del banco (CSV o Excel). Funciones puras: leer valores y fechas, encontrar las columnas,
// marcar duplicados, sugerir tipo o categoría y calcular el ajuste del saldo inicial.

import { armarFecha, diasDelMes, type Fecha } from './fechas';
import type { TipoNegocio } from './negocio';

const sinTildes = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** "$ 1.250.000", "1.250.000,00", "-1,250,000.50", "(45.000)", "45.000-" → número entero de pesos (o null). */
export function leerValor(entrada: string | number | null | undefined): number | null {
  if (typeof entrada === 'number') return Number.isFinite(entrada) ? Math.sign(entrada) * Math.round(Math.abs(entrada)) : null;
  if (!entrada) return null;
  let t = String(entrada).trim();
  let negativo = false;
  if (/^\(.*\)$/.test(t)) {
    negativo = true;
    t = t.slice(1, -1);
  }
  if (/-\s*$/.test(t)) {
    negativo = true;
    t = t.replace(/-\s*$/, '');
  }
  if (t.includes('-')) negativo = true;
  t = t.replace(/[^\d.,]/g, '');
  if (!/\d/.test(t)) return null;
  const ultimoPunto = t.lastIndexOf('.');
  const ultimaComa = t.lastIndexOf(',');
  let numero: number;
  if (ultimoPunto >= 0 && ultimaComa >= 0) {
    // Los dos: el último es el decimal.
    const decimal = ultimoPunto > ultimaComa ? '.' : ',';
    const miles = decimal === '.' ? ',' : '.';
    numero = Number(t.split(miles).join('').replace(decimal, '.'));
  } else {
    const sep = ultimoPunto >= 0 ? '.' : ultimaComa >= 0 ? ',' : null;
    if (!sep) numero = Number(t);
    else {
      const partes = t.split(sep);
      // Varios separadores, o uno seguido de exactamente 3 dígitos: es de miles (lo normal en pesos).
      const esMiles = partes.length > 2 || partes[partes.length - 1].length === 3;
      numero = esMiles ? Number(partes.join('')) : Number(partes.join('.'));
    }
  }
  if (!Number.isFinite(numero)) return null;
  const entero = Math.round(Math.abs(numero));
  return negativo ? -entero : entero;
}

const MESES: Record<string, number> = {
  ene: 1, enero: 1, jan: 1, january: 1,
  feb: 2, febrero: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6, june: 6,
  jul: 7, julio: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  sep: 9, sept: 9, set: 9, septiembre: 9, setiembre: 9, september: 9,
  oct: 10, octubre: 10, october: 10,
  nov: 11, noviembre: 11, november: 11,
  dic: 12, diciembre: 12, dec: 12, december: 12,
};

function valida(anio: number, mes: number, dia: number): Fecha | null {
  if (anio < 100) anio += 2000;
  if (anio < 1990 || anio > 2100 || mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes(anio, mes)) return null;
  return armarFecha(anio, mes, dia);
}

/** 15/08/2026, 2026-08-15, 15-08-26, 20260815, "15 ago 2026", "3 de septiembre de 2026" o la fecha de Excel (número de días). */
export function leerFecha(entrada: string | number | null | undefined): Fecha | null {
  if (typeof entrada === 'number') {
    if (entrada < 20_000 || entrada > 80_000) return null;
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(entrada) * 86_400_000);
    return armarFecha(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  if (!entrada) return null;
  const t = sinTildes(String(entrada)).replace(/\s+de\s+/g, ' ');
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return valida(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (m) return valida(+m[3], +m[2], +m[1]);
  m = t.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return valida(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[\s-]+([a-z]+)\.?[\s-]+(\d{2,4})/);
  if (m && MESES[m[2]]) return valida(+m[3], MESES[m[2]], +m[1]);
  if (/^\d{5}(\.\d+)?$/.test(t)) return leerFecha(Number(t));
  return null;
}

export type Columnas = { fila: number; fecha: number; descripcion: number | null; valor: number | null; debito: number | null; credito: number | null };
export type MovExtracto = { fila: number; fecha: Fecha; descripcion: string; monto: number };

const NOMBRES = {
  fecha: ['fecha', 'date', 'fecha transaccion', 'fecha de transaccion', 'fecha movimiento', 'fecha operacion'],
  descripcion: ['descripcion', 'detalle', 'concepto', 'transaccion', 'referencia', 'description', 'detalle del movimiento', 'movimiento'],
  valor: ['valor', 'monto', 'importe', 'amount', 'valor transaccion', 'valor del movimiento'],
  debito: ['debito', 'debitos', 'cargo', 'cargos', 'retiro', 'retiros', 'salida', 'salidas', 'debit', 'egreso', 'egresos'],
  credito: ['credito', 'creditos', 'abono', 'abonos', 'deposito', 'depositos', 'entrada', 'entradas', 'credit', 'ingreso', 'ingresos'],
} as const;

function columnaDe(titulos: string[], nombres: readonly string[]): number | null {
  const i = titulos.findIndex((t) => nombres.includes(t.replace(/[.:]/g, '').trim()));
  return i >= 0 ? i : null;
}

/** Busca la fila de títulos: la primera con una columna de fecha y una de valor, débito o crédito. */
export function detectarColumnas(filas: string[][]): Columnas | null {
  for (let f = 0; f < Math.min(filas.length, 40); f++) {
    const titulos = filas[f].map((c) => sinTildes(String(c ?? '')));
    const fecha = columnaDe(titulos, NOMBRES.fecha);
    const valor = columnaDe(titulos, NOMBRES.valor);
    const debito = columnaDe(titulos, NOMBRES.debito);
    const credito = columnaDe(titulos, NOMBRES.credito);
    if (fecha !== null && (valor !== null || debito !== null || credito !== null)) {
      return { fila: f, fecha, descripcion: columnaDe(titulos, NOMBRES.descripcion), valor, debito, credito };
    }
  }
  return null;
}

/** B9 · Lee los movimientos: valor con signo, o débito (sale) y crédito (entra). Las filas sin fecha o sin valor se saltan. */
export function leerExtracto(filas: (string | number)[][], manual?: Columnas) {
  const texto = filas.map((f) => f.map((c) => (c === null || c === undefined ? '' : c)));
  const columnas = manual ?? detectarColumnas(texto.map((f) => f.map(String)));
  if (!columnas) return { columnas: null, movimientos: [] as MovExtracto[], sinLeer: 0 };
  const movimientos: MovExtracto[] = [];
  let sinLeer = 0;
  for (let i = columnas.fila + 1; i < texto.length; i++) {
    const f = texto[i];
    if (f.every((c) => String(c).trim() === '')) continue;
    const fecha = leerFecha(f[columnas.fecha] as string | number);
    let monto: number | null = null;
    if (columnas.valor !== null) monto = leerValor(f[columnas.valor] as string | number);
    if (monto === null || monto === 0) {
      const debito = columnas.debito !== null ? leerValor(f[columnas.debito] as string | number) : null;
      const credito = columnas.credito !== null ? leerValor(f[columnas.credito] as string | number) : null;
      if (credito) monto = Math.abs(credito);
      else if (debito) monto = -Math.abs(debito);
    }
    if (!fecha || !monto) {
      // Totales, saldos o filas sin datos: no son movimientos.
      if (fecha || monto) sinLeer++;
      continue;
    }
    const descripcion = columnas.descripcion !== null ? String(f[columnas.descripcion]).trim() : '';
    movimientos.push({ fila: i + 1, fecha, descripcion, monto });
  }
  return { columnas, movimientos, sinLeer };
}

/** B9 · Duplicado: misma fecha, mismo valor y misma dirección. Cada existente "tapa" a uno solo. */
export function marcarDuplicados(nuevos: { fecha: Fecha; monto: number }[], existentes: { fecha: Fecha; monto: number }[]): boolean[] {
  const disponibles = new Map<string, number>();
  for (const e of existentes) disponibles.set(`${e.fecha}|${e.monto}`, (disponibles.get(`${e.fecha}|${e.monto}`) ?? 0) + 1);
  return nuevos.map((n) => {
    const clave = `${n.fecha}|${n.monto}`;
    const quedan = disponibles.get(clave) ?? 0;
    if (quedan > 0) {
      disponibles.set(clave, quedan - 1);
      return true;
    }
    return false;
  });
}

/** B9 · Para que el saldo de hoy no cambie: saldo inicial −= (entradas − salidas). Recibe los montos con signo. */
export function ajusteSaldoInicial(montos: number[]): number {
  return -montos.reduce((s, m) => s + m, 0);
}

const contiene = (texto: string, palabras: string[]) => palabras.some((p) => texto.includes(p));

/** B9 · Tipo sugerido en el negocio según la descripción y si entra (signo +) o sale (−). */
export function sugerirTipo(descripcion: string, signo: number): TipoNegocio {
  const d = sinTildes(descripcion);
  if (signo > 0) return contiene(d, ['desembolso', 'prestamo']) ? 'prestamo' : 'venta';
  if (contiene(d, ['dian', 'impuesto', ' ica', 'ica ', 'predial', '4x1000', 'gmf', 'retencion'])) return 'impuesto';
  if (contiene(d, ['arriendo', 'nomina', 'servicio', 'internet', 'energia', 'acueducto', 'gas natural', 'epm', 'codensa', 'enel', 'claro', 'movistar', 'tigo', 'etb', 'contador', 'seguro', 'administracion'])) return 'fijo';
  if (contiene(d, ['proveedor', 'mercancia', 'materia prima', 'inventario'])) return 'compra';
  return 'variable';
}

const CATEGORIAS: [string, string[]][] = [
  ['mercado', ['exito', 'carulla', ' d1', 'd1 ', 'tiendas d1', ' ara', 'jeronimo martins', 'olimpica', 'jumbo', 'makro', 'metro ', 'supermercado', 'mercado', 'colsubsidio']],
  ['comida', ['rappi', 'ifood', 'restaurante', 'frisby', 'kfc', 'mcdonald', 'burger', 'domicilio', 'juan valdez', 'tostao', 'crepes', 'el corral', 'starbucks', 'pizza', 'panaderia']],
  ['transporte', ['uber', 'didi', 'cabify', 'indriver', 'taxi', 'gasolina', 'terpel', 'esso', 'primax', 'texaco', 'peaje', 'transmilenio', 'tullave', 'parqueadero', 'sitp']],
  ['salidas', ['cine', 'cinemark', 'procinal', 'cinecolombia', 'netflix', 'spotify', 'disney', 'hbo', 'max.com', 'prime video', 'youtube', 'teatro', 'bar ', 'tuboleta']],
  ['mascotas', ['veterinari', 'petshop', 'pet ', 'mascota', 'laika', 'agrocampo']],
  ['shopping', ['falabella', 'zara', 'amazon', 'mercadolibre', 'mercado libre', 'h&m', 'nike', 'adidas', 'arturo calle', 'koaj', 'studio f', 'shein', 'temu']],
];

/** B9 · Categoría personal sugerida por el comercio (clave de las categorías iniciales) o null si no se sabe. */
export function sugerirCategoria(descripcion: string, signo: number): string | null {
  if (signo > 0) return 'ingreso';
  const d = ` ${sinTildes(descripcion)} `;
  return CATEGORIAS.find(([, palabras]) => contiene(d, palabras))?.[0] ?? null;
}

/** El mes que más aparece en el extracto ("2026-08"), para nombrarlo "Bancolombia · agosto 2026". */
export function etiquetaMes(fechas: Fecha[]): string {
  const cuenta = new Map<string, number>();
  for (const f of fechas) cuenta.set(f.slice(0, 7), (cuenta.get(f.slice(0, 7)) ?? 0) + 1);
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '';
}
