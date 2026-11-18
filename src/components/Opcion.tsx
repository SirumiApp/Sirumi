import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { ALTO_TOCABLE, ESPACIO, FUENTES, RADIO, sombraSuave, useTema } from '@/theme';

import { Emoji, type NombreEmoji } from './emoji/Emoji';
import { Texto } from './Texto';

type Props = {
  titulo: string;
  detalle?: string;
  emoji?: NombreEmoji;
  /** Algo para mostrar a la izquierda en lugar del emoji 3D (por ejemplo, una bandera). */
  izquierda?: ReactNode;
  derecha?: string;
  elegida: boolean;
  onPress: () => void;
};

/** Tarjeta que se toca para elegir una opción (país, uso, objetivo…). */
export function Opcion({ titulo, detalle, emoji, izquierda, derecha, elegida, onPress }: Props) {
  const { colores, oscuro } = useTema();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: elegida }}
      onPress={onPress}
      style={({ pressed }) => [{
        flexDirection: 'row',
        alignItems: 'center',
        gap: ESPACIO.m,
        minHeight: ALTO_TOCABLE + 12,
        padding: ESPACIO.m,
        borderRadius: RADIO.l,
        borderWidth: 2,
        borderColor: elegida ? colores.accion : 'transparent',
        backgroundColor: elegida ? colores.seleccionado : colores.tarjeta,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }, sombraSuave(oscuro)]}>
      {izquierda ?? (emoji ? <Emoji name={emoji} size={32} /> : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="fuerte">{titulo}</Texto>
        {detalle ? <Texto variante="pequeno">{detalle}</Texto> : null}
      </View>
      {derecha ? (
        <View style={{ paddingHorizontal: ESPACIO.s + 2, paddingVertical: 3, borderRadius: 999, backgroundColor: colores.seleccionado }}>
          <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={colores.enlace}>
            {derecha}
          </Texto>
        </View>
      ) : null}
    </Pressable>
  );
}
