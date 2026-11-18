import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { FUENTES_A_CARGAR, ProveedorTema, useTema } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RaizLayout() {
  const [fuentesListas, errorFuentes] = useFonts(FUENTES_A_CARGAR);

  useEffect(() => {
    if (fuentesListas || errorFuentes) SplashScreen.hideAsync();
  }, [fuentesListas, errorFuentes]);

  if (!fuentesListas && !errorFuentes) return null;

  return (
    <ProveedorTema>
      <Navegacion />
    </ProveedorTema>
  );
}

function Navegacion() {
  const { oscuro, colores } = useTema();
  const base = oscuro ? DarkTheme : DefaultTheme;
  const temaNavegacion = {
    ...base,
    colors: {
      ...base.colors,
      primary: colores.accion,
      background: colores.fondo,
      card: colores.tarjeta,
      text: colores.texto,
      border: colores.borde,
    },
  };

  return (
    <ThemeProvider value={temaNavegacion}>
      <StatusBar style={oscuro ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
