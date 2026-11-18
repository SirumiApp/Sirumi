import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FUENTES, useTema } from '@/theme';

export default function AuthLayout() {
  const { colores } = useTema();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerTitle: '',
        headerShadowVisible: false,
        headerBackTitle: t('comun.atras'),
        headerBackTitleStyle: { fontFamily: FUENTES.textoFuerte },
        headerTintColor: colores.texto,
        headerStyle: { backgroundColor: colores.fondo },
        contentStyle: { backgroundColor: colores.fondo },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
