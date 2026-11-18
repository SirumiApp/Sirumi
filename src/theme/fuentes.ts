import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Sora_600SemiBold } from '@expo-google-fonts/sora';

/** Fuentes que se cargan al abrir la app (ver app/_layout.tsx). */
export const FUENTES_A_CARGAR = {
  Sora_600SemiBold,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

/**
 * Plus Jakarta Sans (del prototipo) para todo; Sora solo para la palabra "sirumi" del logo.
 */
export const FUENTES = {
  /** Títulos y cifras grandes: muy gruesa, como el prototipo. */
  titulo: 'PlusJakartaSans_800ExtraBold',
  texto: 'PlusJakartaSans_400Regular',
  textoMedio: 'PlusJakartaSans_600SemiBold',
  textoFuerte: 'PlusJakartaSans_700Bold',
  /** Solo para la palabra "sirumi" (siempre en minúscula). */
  marca: 'Sora_600SemiBold',
} as const;

export const TAMANOS = {
  pequeno: 13,
  texto: 15,
  subtitulo: 19,
  titulo: 28,
  cifra: 30,
  /** La cifra principal de cada pantalla ("Gastado en noviembre"). */
  heroe: 46,
} as const;

export const ESPACIO = { xs: 4, s: 8, m: 16, l: 20, xl: 32 } as const;
export const RADIO = { s: 12, m: 16, l: 20 } as const;
/** Alto mínimo de cualquier botón o zona que se toca. */
export const ALTO_TOCABLE = 44;
