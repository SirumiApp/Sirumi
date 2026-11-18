import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, TextInput, View, type TextInputProps } from 'react-native';

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
  const { t } = useTranslation();
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  const colorBorde = error ? colores.error : enfocado ? colores.accion : 'transparent';

  return (
    <View style={{ gap: ESPACIO.xs }}>
      {etiqueta ? <Texto variante="fuerte">{etiqueta}</Texto> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: ALTO_TOCABLE + 8,
          borderWidth: 1.5,
          borderColor: colorBorde,
          borderRadius: RADIO.m,
          backgroundColor: colores.relleno,
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
            // En el navegador, el borde de enfoque lo pone el contenedor (no el recuadro negro del navegador).
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
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
              {visible ? t('comun.ocultar') : t('comun.ver')}
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
