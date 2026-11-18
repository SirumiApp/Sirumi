import { Stack } from 'expo-router';

import { FUENTES, useTema } from '@/theme';

export default function AuthLayout() {
  const { colores } = useTema();
  return (
    <Stack
      screenOptions={{
        headerTitle: '',
        headerShadowVisible: false,
        headerBackTitle: 'Atrás',
        headerBackTitleStyle: { fontFamily: FUENTES.textoFuerte },
        headerTintColor: colores.texto,
        headerStyle: { backgroundColor: colores.fondo },
        contentStyle: { backgroundColor: colores.fondo },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
