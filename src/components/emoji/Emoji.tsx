import { Image } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTema } from '@/theme';

import { ARCHIVOS_EMOJI, EMOJI_POR_CARACTER, type NombreEmoji } from './registro';

type Props = {
  /** Nombre del PNG en assets/emojis/ (sin .png), por ejemplo "tienda". */
  name: NombreEmoji;
  /** Tamaño en puntos. Por defecto 28. */
  size?: number;
  /**
   * Pone el emoji sobre un círculo del color de las tarjetas.
   * Úsalo con los que tienen partes azul Noche (celular, micrófono, balanza) para que se vean en modo oscuro.
   */
  conFondo?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Emoji 3D de Sirumi. Úsalo siempre en lugar de los emojis del sistema (salvo banderas). */
export function Emoji({ name, size = 28, conFondo = false, style }: Props) {
  const { colores } = useTema();
  const imagen = (
    <Image
      source={ARCHIVOS_EMOJI[name]}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
    />
  );

  if (!conFondo) return <View style={style}>{imagen}</View>;

  const lado = Math.round(size * 1.6);
  return (
    <View
      style={[
        {
          width: lado,
          height: lado,
          borderRadius: lado / 2,
          backgroundColor: colores.seleccionado,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      {imagen}
    </View>
  );
}

/** Devuelve el nombre del PNG que reemplaza un emoji del sistema, por ejemplo "🛍️" → "bolsas-de-compras". */
export function nombreDeEmoji(caracter: string): NombreEmoji | undefined {
  return EMOJI_POR_CARACTER[caracter];
}

export type { NombreEmoji };
