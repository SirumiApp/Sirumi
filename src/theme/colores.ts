/** Paleta oficial de Sirumi (ver docs/marca.md). */
export const PALETA = {
  noche: '#1B2B5E',
  cielo: '#5FA9E0',
  hielo: '#A9D6EA',
  nube: '#F5F7FA',
  plata: '#C9D1DD',
  llama: '#F08A24',
  sol: '#F5CF6B',
  brasa: '#E83A3A',
  accion: '#2F6DB5',
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
  /** Texto que se toca (enlaces): Acción en claro, Cielo en oscuro para que se lea sobre las tarjetas. */
  enlace: string;
  seleccionado: string;
  ingreso: string;
  error: string;
  aviso: string;
  destacado: string;
};

export const COLORES_CLARO: Colores = {
  fondo: PALETA.nube,
  tarjeta: '#FDFEFF',
  texto: PALETA.noche,
  textoSuave: '#4E5C80',
  borde: PALETA.plata,
  marca: PALETA.cielo,
  accion: PALETA.accion,
  textoSobreAccion: PALETA.blanco,
  textoSobreMarca: PALETA.noche,
  enlace: PALETA.accion,
  seleccionado: PALETA.hielo,
  ingreso: PALETA.verde,
  error: PALETA.brasa,
  aviso: PALETA.llama,
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
  enlace: PALETA.cielo,
  seleccionado: '#2E4686',
  ingreso: PALETA.verde,
  error: PALETA.brasa,
  aviso: PALETA.llama,
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

/** Colores de las gráficas, validados para daltonismo y contraste (claro sobre tarjeta clara, oscuro sobre #24376F). */
export const COLORES_GRAFICA = {
  claro: { gasto: '#2F6DB5', ingreso: '#2E9E63' },
  oscuro: { gasto: '#4F9AD6', ingreso: '#45AB75' },
} as const;
