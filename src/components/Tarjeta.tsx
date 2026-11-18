import { View, type ViewProps } from 'react-native';

import { ESPACIO, RADIO, useTema } from '@/theme';

export function Tarjeta({ style, ...resto }: ViewProps) {
  const { colores, oscuro } = useTema();
  return (
    <View
      style={[
        {
          backgroundColor: colores.tarjeta,
          borderRadius: RADIO.l,
          padding: ESPACIO.l,
          borderWidth: oscuro ? 0 : 1,
          borderColor: colores.borde,
          gap: ESPACIO.s,
        },
        style,
      ]}
      {...resto}
    />
  );
}
