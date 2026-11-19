import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useUsoApp, veNegocio, vePersonal } from '@/auth/modo';
import { useNegocio } from '@/negocio/contexto';

/** Muestra la pantalla solo si la persona usa esa parte de la app; si no, la lleva a la otra (onboarding: personal, negocio o las dos). */
export function SoloSi({ parte, soloDueno = false, children }: { parte: 'personal' | 'negocio'; soloDueno?: boolean; children: ReactNode }) {
  const uso = useUsoApp();
  const { negocio } = useNegocio();
  // Un vendedor solo ve el POS: las pantallas de plata del negocio lo llevan a su resumen de ventas.
  if (soloDueno && negocio?.rol === 'seller') return <Redirect href="/negocio" />;
  if (uso && parte === 'personal' && !vePersonal(uso)) return <Redirect href="/negocio" />;
  if (uso && parte === 'negocio' && !veNegocio(uso)) return <Redirect href="/" />;
  return <>{children}</>;
}
