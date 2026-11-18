import { View } from 'react-native';

import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { Texto } from '@/components/Texto';
import { ESPACIO } from '@/theme';

import type { DatosOnboarding } from '../datos';

export type PropsPaso = {
  d: DatosOnboarding;
  cambiar: (parcial: Partial<DatosOnboarding>) => void;
  /** true después de que la persona intentó continuar: desde ahí se muestran los errores. */
  intentado: boolean;
};

export function EncabezadoPaso({ titulo, detalle, emoji }: { titulo: string; detalle?: string; emoji?: NombreEmoji }) {
  return (
    <View style={{ gap: ESPACIO.xs }}>
      {emoji ? <Emoji name={emoji} size={44} style={{ marginBottom: ESPACIO.xs }} /> : null}
      <Texto variante="titulo" accessibilityRole="header">
        {titulo}
      </Texto>
      {detalle ? <Texto variante="suave">{detalle}</Texto> : null}
    </View>
  );
}
