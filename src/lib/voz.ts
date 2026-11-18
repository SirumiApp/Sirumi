// Entiende un movimiento dicho con el micrófono del teclado (o escrito): "25 mil almuerzo", "me pagaron el sueldo 3 millones".
// Basado en la lógica del prototipo (referencia/prototipo/Main.dc.html, parseVoice). Funciona en español y en inglés.

import type { TipoMovimiento } from './personal';

/** Clave de una categoría inicial (shopping, comida…) o null si no se reconoce. */
export type FraseInterpretada = { monto: number; tipo: TipoMovimiento; categoria: string | null; descripcion: string };

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30,
  cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100,
  doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700,
  ochocientos: 800, novecientos: 900, medio: 0.5,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, half: 0.5,
};
const MIL = ['mil', 'thousand', 'k'];
const MILLON = ['millon', 'millones', 'million', 'millions'];

/** El monto de la frase en pesos enteros, o 0 si no hay. */
export function montoDeFrase(frase: string): number {
  const t = normalizar(frase);
  const cifra = t.match(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(millones|millon|millions|million|mil|thousand|k)?\b/);
  if (cifra) {
    let numero = cifra[1];
    numero = /^\d{1,3}([.,]\d{3})+$/.test(numero) ? numero.replace(/[.,]/g, '') : numero.replace(',', '.');
    let valor = parseFloat(numero);
    if (cifra[2] && MIL.includes(cifra[2])) valor *= 1_000;
    if (cifra[2] && MILLON.includes(cifra[2])) valor *= 1_000_000;
    if (valor > 0) return Math.round(valor);
  }
  let millones = 0;
  let miles = 0;
  let actual = 0;
  let encontrado = false;
  for (const palabra of t.split(/[\s,]+/)) {
    if (NUMEROS[palabra] !== undefined) {
      actual += NUMEROS[palabra];
      encontrado = true;
    } else if (palabra === 'hundred') {
      actual = (actual || 1) * 100;
      encontrado = true;
    } else if (MIL.includes(palabra)) {
      miles += (actual || 1) * 1_000;
      actual = 0;
      encontrado = true;
    } else if (MILLON.includes(palabra)) {
      millones += (actual || 1) * 1_000_000;
      actual = 0;
      encontrado = true;
    }
  }
  const total = millones + miles + actual;
  return encontrado && total >= 100 ? Math.round(total) : 0;
}

/** Palabras que delatan cada categoría (en orden: la primera que coincida gana). */
const PISTAS: [string, string[]][] = [
  ['ingreso', ['me pagaron', 'pagaron', 'recibi', 'salario', 'sueldo', 'me llego', 'ingreso', 'me consignaron', 'nomina', 'salary', 'paycheck', 'got paid', 'income']],
  ['comida', ['hamburguesa', 'corral', 'almuerzo', 'comida', 'restaurante', 'cafe', 'pizza', 'domicilio', 'desayuno', 'cena', 'helado', 'rappi', 'lunch', 'dinner', 'breakfast', 'coffee', 'restaurant']],
  ['transporte', ['uber', 'taxi', 'gasolina', 'bus', 'metro', 'pasaje', 'peaje', 'didi', 'transmilenio', 'parqueadero', 'parking', 'gas']],
  ['mercado', ['mercado', 'supermercado', 'exito', 'jumbo', 'verdura', 'fruta', 'carulla', 'olimpica', 'd1', 'ara', 'groceries', 'grocery', 'supermarket']],
  ['salidas', ['cine', 'bar', 'fiesta', 'concierto', 'cerveza', 'trago', 'salida', 'discoteca', 'rumba', 'movie', 'movies', 'beer', 'party']],
  ['mascotas', ['perro', 'veterinari', 'croqueta', 'mascota', 'gato', 'dog', 'cat', 'vet', 'pet']],
  ['shopping', ['zapato', 'ropa', 'camisa', 'tenis', 'jean', 'vestido', 'regalo', 'amazon', 'mercadolibre', 'shoes', 'clothes', 'shirt']],
];

/** Palabras que no aportan a la descripción (verbos de gasto, montos, monedas). */
const SOBRAN = new Set([
  'me', 'gaste', 'gasto', 'pague', 'pago', 'compre', 'vendi', 'recibi', 'pagaron', 'pesos', 'peso', 'dolares', 'dollars',
  'dollar', 'spent', 'paid', 'bought', 'i', 'y', 'and', 'hundred', ...MIL, ...MILLON, ...Object.keys(NUMEROS),
]);
const CONECTORES = new Set(['en', 'de', 'a', 'el', 'la', 'por', 'del', 'al', 'unos', 'unas', 'los', 'las', 'on', 'the', 'for', 'at', 'of']);

function coincide(palabras: string[], frase: string, pista: string): boolean {
  if (pista.includes(' ')) return ` ${frase} `.includes(` ${pista} `);
  return palabras.some((p) => p === pista || p === `${pista}s` || p === `${pista}es` || (pista.length >= 5 && p.startsWith(pista)));
}

export function interpretarFrase(frase: string): FraseInterpretada {
  const normal = normalizar(frase).replace(/[^a-z0-9.,$ ]/g, ' ');
  const palabras = normal.split(/\s+/).filter(Boolean);
  const categoria = PISTAS.find(([, pistas]) => pistas.some((p) => coincide(palabras, normal, p)))?.[0] ?? null;

  const originales = frase.trim().split(/\s+/).filter((palabra) => {
    const n = normalizar(palabra).replace(/[^a-z0-9.,]/g, '');
    return n !== '' && !/^\d[\d.,]*k?$/.test(n) && !SOBRAN.has(n);
  });
  while (originales.length && CONECTORES.has(normalizar(originales[0]))) originales.shift();
  while (originales.length && CONECTORES.has(normalizar(originales[originales.length - 1]))) originales.pop();
  let descripcion = originales.join(' ').replace(/[,.]+$/, '');
  descripcion = descripcion.charAt(0).toUpperCase() + descripcion.slice(1);
  if (descripcion.length > 40) descripcion = `${descripcion.slice(0, 40).trim()}…`;

  return { monto: montoDeFrase(frase), tipo: categoria === 'ingreso' ? 'ingreso' : 'gasto', categoria, descripcion };
}
