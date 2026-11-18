import { Stack } from 'expo-router';

import { useTema } from '@/theme';

export default function AjustesLayout() {
  const { colores } = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }} />;
}
