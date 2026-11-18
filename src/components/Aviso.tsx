import { View } from 'react-native';

import { ESPACIO, RADIO, useTema } from '@/theme';

import { Emoji } from './emoji/Emoji';
import { Texto } from './Texto';

/** Mensaje de error o de ayuda dentro de un formulario. */
export function Aviso({ mensaje, tipo = 'error' }: { mensaje: string; tipo?: 'error' | 'info' }) {
  const { colores } = useTema();
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: ESPACIO.s,
        alignItems: 'center',
        padding: ESPACIO.m,
        borderRadius: RADIO.m,
        borderWidth: 1.5,
        borderColor: tipo === 'error' ? colores.error : colores.marca,
        backgroundColor: colores.tarjeta,
      }}>
      <Emoji name={tipo === 'error' ? 'advertencia' : 'globo-de-dialogo'} size={22} />
      <Texto style={{ flex: 1 }}>{mensaje}</Texto>
    </View>
  );
}
