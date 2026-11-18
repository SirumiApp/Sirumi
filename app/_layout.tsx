import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ProveedorSesion, useSesion } from '@/auth/sesion';
import { FUENTES_A_CARGAR, ProveedorTema, useTema } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RaizLayout() {
  const [fuentesListas, errorFuentes] = useFonts(FUENTES_A_CARGAR);

  return (
    <ProveedorTema>
      <ProveedorSesion>
        {fuentesListas || errorFuentes ? <Navegacion /> : null}
      </ProveedorSesion>
    </ProveedorTema>
  );
}

function Navegacion() {
  const { oscuro, colores } = useTema();
  const { sesion, cargando } = useSesion();

  useEffect(() => {
    if (!cargando) SplashScreen.hideAsync();
  }, [cargando]);

  if (cargando) return null;

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
      <Stack screenOptions={{ headerShown: false }}>
        {/* Con sesión: la app. Sin sesión: bienvenida, registro y entrada. */}
        <Stack.Protected guard={!!sesion}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!sesion}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
