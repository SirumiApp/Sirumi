import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Emoji } from '@/components/emoji/Emoji';
import { Texto } from '@/components/Texto';
import { ALTO_TOCABLE, ESPACIO, FUENTES, useTema } from '@/theme';

import { cambiarModoEjemplo, useModoEjemplo } from './modo';

/** Franja que recuerda que se están viendo datos de ejemplo, con el botón para salir. */
export function BandaEjemplo() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const ejemplo = useModoEjemplo();
  if (!ejemplo) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, paddingLeft: ESPACIO.m, paddingRight: 4, minHeight: ALTO_TOCABLE + 8, borderRadius: 999, backgroundColor: colores.avisoFondo }}>
      <Emoji name="ojos" size={22} />
      <Texto style={{ flex: 1, fontFamily: FUENTES.textoFuerte }} color={colores.avisoTexto}>
        {t('ejemplo.banda')}
      </Texto>
      <Pressable
        accessibilityRole="button"
        onPress={() => cambiarModoEjemplo(false)}
        style={({ pressed }) => ({ minHeight: ALTO_TOCABLE, paddingHorizontal: ESPACIO.m, borderRadius: 999, justifyContent: 'center', backgroundColor: colores.tarjeta, opacity: pressed ? 0.8 : 1 })}>
        <Texto variante="fuerte" color={colores.enlace}>
          {t('ejemplo.salir')}
        </Texto>
      </Pressable>
    </View>
  );
}
