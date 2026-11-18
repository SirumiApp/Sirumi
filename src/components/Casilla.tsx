import { Pressable, View } from 'react-native';

import { ALTO_TOCABLE, ESPACIO, FUENTES, RADIO, sombraSuave, useTema } from '@/theme';

import { Texto } from './Texto';

type Props = {
  titulo: string;
  detalle?: string;
  marcada: boolean;
  /** Se pone roja cuando es obligatoria y la persona intentó seguir sin marcarla. */
  conError?: boolean;
  onPress: () => void;
};

export function Casilla({ titulo, detalle, marcada, conError = false, onPress }: Props) {
  const { colores, oscuro } = useTema();
  const borde = marcada ? colores.accion : conError ? colores.error : 'transparent';
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      onPress={onPress}
      style={({ pressed }) => [{
        flexDirection: 'row',
        gap: ESPACIO.m,
        alignItems: 'flex-start',
        minHeight: ALTO_TOCABLE,
        padding: ESPACIO.m,
        borderRadius: RADIO.l,
        borderWidth: 2,
        borderColor: borde,
        backgroundColor: colores.tarjeta,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }, sombraSuave(oscuro)]}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: marcada ? colores.accion : conError ? colores.error : colores.textoSuave,
          backgroundColor: marcada ? colores.accion : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}>
        {marcada ? (
          <Texto style={{ color: colores.textoSobreAccion, fontFamily: FUENTES.textoFuerte, fontSize: 14, lineHeight: 16 }}>
            ✓
          </Texto>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="fuerte">{titulo}</Texto>
        {detalle ? <Texto variante="pequeno">{detalle}</Texto> : null}
      </View>
    </Pressable>
  );
}
