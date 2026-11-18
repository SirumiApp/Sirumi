import { Pressable } from 'react-native';

import { ALTO_TOCABLE, ESPACIO, FUENTES, TAMANOS, useTema } from '@/theme';

import { Texto } from './Texto';

/** Botón pequeño para elegir una opción entre varias (tipo de documento, meses…). */
export function Chip({ texto, elegido, onPress }: { texto: string; elegido: boolean; onPress: () => void }) {
  const { colores } = useTema();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: elegido }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: ALTO_TOCABLE,
        paddingHorizontal: ESPACIO.m,
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: elegido ? colores.accion : colores.borde,
        backgroundColor: elegido ? colores.accion : 'transparent',
        opacity: pressed ? 0.85 : 1,
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
