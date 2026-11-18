// Genera src/components/emoji/registro.ts a partir de los PNG de assets/emojis/.
// Úsalo cada vez que agregues o quites un emoji:  npm run emojis
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'assets/emojis');
const salida = join(raiz, 'src/components/emoji/registro.ts');

const nombres = readdirSync(carpeta)
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.slice(0, -4))
  .sort();

const mapa = JSON.parse(readFileSync(join(carpeta, 'mapa-emojis.json'), 'utf8'));

const lineasArchivos = [
  ...nombres.map((n) => `  '${n}': require('../../../assets/emojis/${n}.png'),`),
  `  cohete: require('../../../assets/marca/cohete.png'),`,
];

const lineasMapa = Object.entries(mapa).map(([caracter, archivo]) => {
  const nombre = archivo.startsWith('../marca/') ? 'cohete' : archivo;
  return `  '${caracter}': '${nombre}',`;
});

const codigo = `// Archivo generado por scripts/generar-emojis.mjs. No lo edites a mano: corre \`npm run emojis\`.
/* eslint-disable */
import type { ImageSourcePropType } from 'react-native';

export const ARCHIVOS_EMOJI = {
${lineasArchivos.join('\n')}
} satisfies Record<string, ImageSourcePropType>;

export type NombreEmoji = keyof typeof ARCHIVOS_EMOJI;

/** Qué emoji del sistema reemplaza cada PNG (sale de assets/emojis/mapa-emojis.json). */
export const EMOJI_POR_CARACTER: Record<string, NombreEmoji> = {
${lineasMapa.join('\n')}
};
`;

mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, codigo);
console.log(`Listo: ${nombres.length + 1} emojis en ${salida.replace(raiz + '/', '')}`);
