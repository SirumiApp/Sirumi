import type { ViewStyle } from 'react-native';

import { PALETA } from './colores';

/** Sombra suave azul del prototipo (0 6 24 de Acción al 8%) para tarjetas en modo claro. En oscuro la separa el color. */
export function sombraSuave(oscuro: boolean): ViewStyle {
  if (oscuro) return {};
  return { shadowColor: PALETA.accion, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 6 }, elevation: 2 };
}

/** Sombra de color para el botón principal y el botón +, para que "floten" (0 8 20 de Acción al 40%). */
export function sombraAccion(oscuro: boolean): ViewStyle {
  return {
    shadowColor: oscuro ? '#000000' : PALETA.accion,
    shadowOpacity: oscuro ? 0.4 : 0.38,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  };
}

/** Sombra de la barra flotante de abajo (0 10 30 de Noche al 14%). */
export function sombraFlotante(oscuro: boolean): ViewStyle {
  return {
    shadowColor: oscuro ? '#000000' : PALETA.noche,
    shadowOpacity: oscuro ? 0.45 : 0.14,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  };
}
