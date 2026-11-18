import type { ViewStyle } from 'react-native';

import { PALETA } from './colores';

/** Sombra suave en azul Noche para tarjetas en modo claro. En oscuro no hace falta: el contraste lo da el color. */
export function sombraSuave(oscuro: boolean): ViewStyle {
  if (oscuro) return {};
  return {
    shadowColor: PALETA.noche,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  };
}

/** Sombra de color para el botón principal y el botón +, para que "floten". */
export function sombraAccion(oscuro: boolean): ViewStyle {
  return {
    shadowColor: oscuro ? '#000000' : PALETA.accion,
    shadowOpacity: oscuro ? 0.35 : 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  };
}
