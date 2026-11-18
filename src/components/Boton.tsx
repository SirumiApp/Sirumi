import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { ALTO_TOCABLE, ESPACIO, FUENTES, RADIO, TAMANOS, useTema } from '@/theme';

import { Texto } from './Texto';

type Props = Omit<PressableProps, 'children'> & {
  titulo: string;
  variante?: 'principal' | 'secundario' | 'texto';
  cargando?: boolean;
};

/** Botón de la marca. El principal es Acción con texto blanco; siempre mide al menos 44 puntos de alto. */
export function Boton({ titulo, variante = 'principal', cargando = false, disabled, style, ...resto }: Props) {
  const { colores } = useTema();
  const inactivo = disabled || cargando;
  const fondo = variante === 'principal' ? colores.accion : 'transparent';
  const colorTexto = variante === 'principal' ? colores.textoSobreAccion : colores.texto;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: cargando }}
      disabled={inactivo}
      style={(estado) => [
        {
          minHeight: ALTO_TOCABLE + 8,
          borderRadius: RADIO.m,
          paddingHorizontal: ESPACIO.l,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fondo,
          borderWidth: variante === 'secundario' ? 1.5 : 0,
          borderColor: colores.borde,
          opacity: inactivo ? 0.6 : estado.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(estado) : style,
      ]}
      {...resto}>
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: TAMANOS.texto, color: colorTexto }}>
          {titulo}
        </Texto>
      )}
    </Pressable>
  );
}
