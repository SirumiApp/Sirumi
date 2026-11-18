import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { ALTO_TOCABLE, ESPACIO, FUENTES, RADIO, TAMANOS, useTema } from '@/theme';

import { Texto } from './Texto';

type Props = TextInputProps & {
  etiqueta: string;
  error?: string | null;
  ayuda?: string;
  /** Campo de contraseña con botón para mostrarla u ocultarla. */
  contrasena?: boolean;
};

export function CampoTexto({ etiqueta, error, ayuda, contrasena = false, style, ...resto }: Props) {
  const { colores } = useTema();
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  const colorBorde = error ? colores.error : enfocado ? colores.accion : colores.borde;

  return (
    <View style={{ gap: ESPACIO.xs }}>
      <Texto variante="fuerte">{etiqueta}</Texto>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: ALTO_TOCABLE + 8,
          borderWidth: 1.5,
          borderColor: colorBorde,
          borderRadius: RADIO.m,
          backgroundColor: colores.tarjeta,
          paddingHorizontal: ESPACIO.m,
        }}>
        <TextInput
          accessibilityLabel={etiqueta}
          placeholderTextColor={colores.textoSuave}
          secureTextEntry={contrasena && !visible}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          style={[
            { flex: 1, fontFamily: FUENTES.texto, fontSize: TAMANOS.texto + 1, color: colores.texto, paddingVertical: ESPACIO.s },
            style,
          ]}
          {...resto}
        />
        {contrasena && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            style={{ minHeight: ALTO_TOCABLE, justifyContent: 'center', paddingLeft: ESPACIO.s }}>
            <Texto variante="pequeno" style={{ fontFamily: FUENTES.textoFuerte }}>
              {visible ? 'Ocultar' : 'Ver'}
            </Texto>
          </Pressable>
        )}
      </View>
      {error ? (
        <Texto variante="pequeno" color={colores.error}>
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="pequeno">{ayuda}</Texto>
      ) : null}
    </View>
  );
}
