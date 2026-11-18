import { View, type ViewProps } from 'react-native';

import { ESPACIO, RADIO, sombraSuave, useTema } from '@/theme';

/** Tarjeta sin borde, con esquinas redondas y sombra suave (en oscuro la separa su color). */
export function Tarjeta({ style, ...resto }: ViewProps) {
  const { colores, oscuro } = useTema();
  return (
    <View
      style={[
        { backgroundColor: colores.tarjeta, borderRadius: RADIO.l, padding: ESPACIO.l, gap: ESPACIO.s },
        sombraSuave(oscuro),
        style,
      ]}
      {...resto}
    />
  );
}
