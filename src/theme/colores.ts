/**
 * Paleta de Sirumi (ver docs/marca.md). Mezcla aprobada (nov 2026): el diseño del prototipo
 * (azul brillante, fondo celeste muy claro, tarjetas blancas con sombra azul) con la marca Sirumi
 * (Noche para textos y modo oscuro, Cielo, logo cohete y emojis 3D).
 */
export const PALETA = {
  noche: '#1B2B5E',
  cielo: '#5FA9E0',
  hielo: '#A9D6EA',
  nube: '#F4F8FF',
  plata: '#E3EBF8',
  llama: '#F08A24',
  sol: '#F5CF6B',
  brasa: '#E83A3A',
  /** Azul de acción del prototipo: botones con texto blanco (contraste 4,6:1). */
  accion: '#1F6FEB',
  verde: '#5CC08A',
  blanco: '#FFFFFF',
} as const;

export type Colores = {
  fondo: string;
  tarjeta: string;
  texto: string;
  textoSuave: string;
  borde: string;
  marca: string;
  /** Fondo de botones principales. El texto encima siempre va en `textoSobreAccion`. */
  accion: string;
  textoSobreAccion: string;
  /** Texto o ícono sobre Cielo: nunca blanco, siempre Noche. */
  textoSobreMarca: string;
  /** Texto que se toca (enlaces) y elementos activos. */
  enlace: string;
  /** Fondo suave azul: chips de información, opción elegida, recomendaciones. */
  seleccionado: string;
  /** Relleno suave de campos, chips y teclas. */
  relleno: string;
  /** Verde para rellenos (barras, puntos). */
  ingreso: string;
  /** Verde para textos de plata que entra (más oscuro, para que se lea). */
  ingresoTexto: string;
  error: string;
  errorFondo: string;
  errorTexto: string;
  aviso: string;
  avisoFondo: string;
  avisoTexto: string;
  destacado: string;
};

export const COLORES_CLARO: Colores = {
  fondo: PALETA.nube,
  tarjeta: PALETA.blanco,
  texto: PALETA.noche,
  textoSuave: '#56657F',
  borde: PALETA.plata,
  marca: PALETA.cielo,
  accion: PALETA.accion,
  textoSobreAccion: PALETA.blanco,
  textoSobreMarca: PALETA.noche,
  enlace: PALETA.accion,
  seleccionado: '#E6F0FF',
  relleno: '#EEF3FB',
  ingreso: PALETA.verde,
  ingresoTexto: '#0A7A4B',
  error: '#C2410C',
  errorFondo: '#FFE9DA',
  errorTexto: '#9A3412',
  aviso: '#D08A0B',
  avisoFondo: '#FFF4C7',
  avisoTexto: '#854D0E',
  destacado: PALETA.sol,
};

export const COLORES_OSCURO: Colores = {
  fondo: PALETA.noche,
  tarjeta: '#24376F',
  texto: PALETA.blanco,
  textoSuave: '#BCC8E6',
  borde: '#34488A',
  marca: PALETA.cielo,
  accion: PALETA.accion,
  textoSobreAccion: PALETA.blanco,
  textoSobreMarca: PALETA.noche,
  enlace: '#7DB6FF',
  seleccionado: '#2E4686',
  relleno: '#2A3F7C',
  ingreso: PALETA.verde,
  ingresoTexto: '#4ADE9A',
  error: '#FDA066',
  errorFondo: '#4A2A14',
  errorTexto: '#FDA066',
  aviso: '#FACC15',
  avisoFondo: '#4A3F10',
  avisoTexto: '#FACC15',
  destacado: PALETA.sol,
};

/** Colores suaves de las categorías (fondo del emoji), en claro y en oscuro. */
export const COLORES_CATEGORIA = {
  azul: { claro: '#D5E3FF', oscuro: '#2E4686' },
  naranja: { claro: '#FFE3C2', oscuro: '#5A4126' },
  amarillo: { claro: '#FFF1B8', oscuro: '#55502A' },
  verde: { claro: '#DDF5C9', oscuro: '#2F5228' },
  morado: { claro: '#EBD8FF', oscuro: '#523272' },
  cafe: { claro: '#F6E3CF', oscuro: '#5A4732' },
  menta: { claro: '#D4F5E4', oscuro: '#1F5040' },
  rosa: { claro: '#FFD9E6', oscuro: '#5A2A42' },
  gris: { claro: '#E3E8EF', oscuro: '#3A4A70' },
} as const;

export type ColorCategoria = keyof typeof COLORES_CATEGORIA;

/**
 * Colores de las gráficas, validados para daltonismo y contraste (claro sobre blanco, oscuro sobre #24376F).
 * Barras: meses anteriores en tono suave y el mes actual en `gasto`; ingresos en línea punteada verde.
 */
export const COLORES_GRAFICA = {
  claro: { gasto: '#1F6FEB', gastoSuave: '#BBD3F7', ingreso: '#2E9E63' },
  oscuro: { gasto: '#4F9AD6', gastoSuave: '#3A5292', ingreso: '#45AB75' },
} as const;

/** Partes de "De cada $100 que vendes" (Resultados del negocio). Lo que queda usa el verde de las gráficas. */
export const COLORES_DE_CADA_100 = {
  claro: { costo: '#9DB4E8', fijos: '#1F6FEB', variables: '#8A5CC7', impuestos: '#C98A2B' },
  oscuro: { costo: '#7D93C9', fijos: '#4F9AD6', variables: '#B58BE0', impuestos: '#D9A44E' },
} as const;

/** Fondo del aviso "¡Venta!" del POS: verde oscuro para que el texto blanco se lea bien (contraste ≥ 4,5). */
export const COLOR_VENTA = { claro: '#1B7A47', oscuro: '#1F6B45' } as const;
