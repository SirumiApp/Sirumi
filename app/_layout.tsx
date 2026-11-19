import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { ProveedorSesion, useSesion } from '@/auth/sesion';
import { cargarIdiomaGuardado } from '@/i18n';
import { ProveedorNegocio } from '@/negocio/contexto';
import { ProveedorPersonal } from '@/personal/contexto';
import { FUENTES_A_CARGAR, ProveedorTema, useTema } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RaizLayout() {
  const [fuentesListas, errorFuentes] = useFonts(FUENTES_A_CARGAR);
  const [idiomaListo, setIdiomaListo] = useState(false);

  useEffect(() => {
    cargarIdiomaGuardado().finally(() => setIdiomaListo(true));
  }, []);

  return (
    <ProveedorTema>
      <ProveedorSesion>{(fuentesListas || errorFuentes) && idiomaListo ? <Navegacion /> : null}</ProveedorSesion>
    </ProveedorTema>
  );
}

function Navegacion() {
  const { oscuro, colores } = useTema();
  const { sesion, cargando, onboardingListo, enOnboarding } = useSesion();

  // Mientras se crea la cuenta dentro del onboarding no se desmonta nada (se perdería lo escrito).
  const esperando = cargando && !enOnboarding;

  useEffect(() => {
    if (!esperando) SplashScreen.hideAsync();
  }, [esperando]);

  if (esperando) return null;

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
      <ProveedorPersonal>
        <ProveedorNegocio>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Con sesión y onboarding terminado: la app. Sin sesión: bienvenida y entrada.
            El onboarding sirve para crear la cuenta (sin sesión) o para completarla (con sesión). */}
            <Stack.Protected guard={!!sesion && onboardingListo === true && !enOnboarding}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="ajustes" />
              <Stack.Screen name="plan" />
              <Stack.Screen name="arranque" />
              <Stack.Screen name="informe/[cual]" />
              <Stack.Screen name="contactos/index" />
              <Stack.Screen name="contactos/[id]" />
              <Stack.Screen name="recurrentes" />
              <Stack.Screen name="inventario/index" />
              <Stack.Screen name="inventario/[id]" />
              <Stack.Screen name="inventario/bodegas" />
              <Stack.Screen name="inventario/mercancia" />
              <Stack.Screen name="inventario/importar" />
              <Stack.Screen name="pos" />
            </Stack.Protected>
            <Stack.Protected guard={!sesion}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Protected guard={!sesion || onboardingListo === false || enOnboarding}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
          </Stack>
        </ProveedorNegocio>
      </ProveedorPersonal>
    </ThemeProvider>
  );
}
