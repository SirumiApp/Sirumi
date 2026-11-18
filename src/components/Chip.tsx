import { Pressable } from 'react-native';

import { ALTO_TOCABLE, ESPACIO, FUENTES, TAMANOS, useTema } from '@/theme';

import { Texto } from './Texto';

/** Botón pequeño para elegir una opción entre varias (tipo de documento, meses…). */
export function Chip({ texto, elegido, onPress, accessibilityLabel }: { texto: string; elegido: boolean; onPress: () => void; accessibilityLabel?: string }) {
  const { colores } = useTema();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: elegido }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: ALTO_TOCABLE,
        paddingHorizontal: ESPACIO.m,
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: elegido ? colores.accion : colores.relleno,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}>
      <Texto
        style={{
          fontFamily: FUENTES.textoFuerte,
          fontSize: TAMANOS.pequeno + 1,
          color: elegido ? colores.textoSobreAccion : colores.texto,
        }}>
        {texto}
      </Texto>
    </Pressable>
  );
}
