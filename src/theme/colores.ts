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
  seleccionado: '#2E4686',
  ingreso: PALETA.verde,
  error: PALETA.brasa,
  aviso: PALETA.llama,
  destacado: PALETA.sol,
};
