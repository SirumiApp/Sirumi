import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n, { changeLanguage, use as usarPlugin } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './en';
import { es } from './es';

/** Para agregar un idioma: crea su archivo (copia de es.ts traducida), súmalo aquí y en IDIOMAS. */
export const IDIOMAS = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'English' },
] as const;

export type Idioma = (typeof IDIOMAS)[number]['codigo'];

const CLAVE_IDIOMA = 'sirumi.idioma';

export function esIdioma(valor: unknown): valor is Idioma {
  return IDIOMAS.some((i) => i.codigo === valor);
}

/** El idioma del celular si la app lo tiene; si no, español. */
export function idiomaDelCelular(codigos: (string | null | undefined)[]): Idioma {
  return codigos.find(esIdioma) ?? 'es';
}

usarPlugin(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: idiomaDelCelular(safeLocales()),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  returnNull: false,
});

function safeLocales(): string[] {
  try {
    return getLocales().map((l) => l.languageCode ?? '');
  } catch {
    return [];
  }
}

/** Si la persona ya eligió un idioma en este celular, se usa ese. */
export async function cargarIdiomaGuardado(): Promise<Idioma | null> {
  try {
    const guardado = await AsyncStorage.getItem(CLAVE_IDIOMA);
    if (esIdioma(guardado)) {
      await changeLanguage(guardado);
      return guardado;
    }
  } catch {
    // Sin almacenamiento se queda el idioma del celular.
  }
  return null;
}

export async function cambiarIdioma(idioma: Idioma) {
  await changeLanguage(idioma);
  try {
    await AsyncStorage.setItem(CLAVE_IDIOMA, idioma);
  } catch {
    // No pasa nada: la próxima vez arranca con el idioma del celular.
  }
}

export function idiomaActual(): Idioma {
  return esIdioma(i18n.language) ? i18n.language : 'es';
}

export default i18n;
