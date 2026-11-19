import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { ALTO_TOCABLE, useTema } from '@/theme';

import { Icono } from './Icono';

/** La X redonda para cerrar una hoja o ventana (siempre visible, 44 puntos). */
export function BotonCerrar({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('comun.cerrar')}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.relleno, opacity: pressed ? 0.7 : 1 })}>
      <Icono nombre="cerrar" tamano={18} />
    </Pressable>
  );
}
