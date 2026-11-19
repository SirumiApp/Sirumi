import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useUsoApp, veNegocio, vePersonal } from '@/auth/modo';

/** Muestra la pantalla solo si la persona usa esa parte de la app; si no, la lleva a la otra (onboarding: personal, negocio o las dos). */
export function SoloSi({ parte, children }: { parte: 'personal' | 'negocio'; children: ReactNode }) {
  const uso = useUsoApp();
  if (uso && parte === 'personal' && !vePersonal(uso)) return <Redirect href="/negocio" />;
  if (uso && parte === 'negocio' && !veNegocio(uso)) return <Redirect href="/" />;
  return <>{children}</>;
}
