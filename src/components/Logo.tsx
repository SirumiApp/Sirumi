import { View } from 'react-native';

import { ESPACIO, FUENTES } from '@/theme';

import { Emoji } from './emoji/Emoji';
import { Texto } from './Texto';

/** Cohete + la palabra "sirumi" (siempre en minúscula). */
export function Logo({ tamano = 28 }: { tamano?: number }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}
      accessibilityRole="header"
      accessibilityLabel="sirumi">
      <Emoji name="cohete" size={tamano} />
      <Texto style={{ fontFamily: FUENTES.titulo, fontSize: tamano * 0.85, lineHeight: tamano * 1.1 }}>
        sirumi
      </Texto>
    </View>
  );
}
