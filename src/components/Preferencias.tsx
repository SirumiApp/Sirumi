import { View } from 'react-native';

import { ESPACIO } from '@/theme';

import { BotonApariencia } from './BotonApariencia';
import { SelectorIdioma } from './SelectorIdioma';

/** Idioma y apariencia juntos, siempre a la vista (hasta que exista Ajustes, y después también ahí). */
export function Preferencias({ centrado = false }: { centrado?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, justifyContent: centrado ? 'center' : 'flex-start' }}>
      <SelectorIdioma />
      <BotonApariencia />
    </View>
  );
}
