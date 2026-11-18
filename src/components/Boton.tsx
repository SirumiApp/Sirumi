import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { ALTO_TOCABLE, ESPACIO, FUENTES, sombraAccion, TAMANOS, useTema } from '@/theme';

import { Texto } from './Texto';

type Props = Omit<PressableProps, 'children'> & {
  titulo: string;
  variante?: 'principal' | 'secundario' | 'texto';
  cargando?: boolean;
};

/**
 * Botón de la marca, en forma de píldora. El principal es Acción con texto blanco y sombra de color;
 * el secundario tiene relleno suave; el de texto es solo la palabra. Siempre mide al menos 44 puntos.
 * Al tocarlo se encoge un poco, para que se sienta.
 */
export function Boton({ titulo, variante = 'principal', cargando = false, disabled, style, ...resto }: Props) {
  const { colores, oscuro } = useTema();
  const inactivo = disabled || cargando;
  const fondo = variante === 'principal' ? colores.accion : variante === 'secundario' ? colores.relleno : 'transparent';
  const colorTexto = variante === 'principal' ? colores.textoSobreAccion : variante === 'texto' ? colores.enlace : colores.texto;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: cargando }}
      disabled={inactivo}
      style={(estado) => [
        {
          minHeight: variante === 'texto' ? ALTO_TOCABLE : ALTO_TOCABLE + 10,
          borderRadius: 999,
          paddingHorizontal: ESPACIO.l,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fondo,
          opacity: inactivo ? 0.55 : 1,
          transform: [{ scale: estado.pressed && !inactivo ? 0.97 : 1 }],
        },
        variante === 'principal' && !inactivo ? sombraAccion(oscuro) : null,
        typeof style === 'function' ? style(estado) : style,
      ]}
      {...resto}>
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: TAMANOS.texto + 1, color: colorTexto }}>{titulo}</Texto>
      )}
    </Pressable>
  );
}
