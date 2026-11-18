import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Sora_600SemiBold } from '@expo-google-fonts/sora';

/** Fuentes que se cargan al abrir la app (ver app/_layout.tsx). */
export const FUENTES_A_CARGAR = {
  Sora_600SemiBold,
  Inter_400Regular,
  Inter_600SemiBold,
};

export const FUENTES = {
  /** Títulos, cifras grandes y la palabra "sirumi". */
  titulo: 'Sora_600SemiBold',
  texto: 'Inter_400Regular',
  textoFuerte: 'Inter_600SemiBold',
} as const;

export const TAMANOS = {
  pequeno: 13,
  texto: 15,
  subtitulo: 18,
  titulo: 24,
  cifra: 32,
} as const;

export const ESPACIO = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
export const RADIO = { s: 10, m: 16, l: 24 } as const;
/** Alto mínimo de cualquier botón o zona que se toca. */
export const ALTO_TOCABLE = 44;
