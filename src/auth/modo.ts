// Qué partes de la app ve cada persona según lo que eligió en el onboarding (o después en Ajustes):
// solo Personal, solo Negocio o las dos.

import { usePerfil } from './perfil';

/** 'vendedor': vende en el negocio de alguien con un código (solo ve ese POS). */
export type UsoApp = 'personal' | 'negocio' | 'ambos' | 'vendedor';

/** Lo guardado en profiles.usage. Si no hay nada (o algo raro), se muestran las dos. */
export function usoDeApp(guardado: string | null | undefined): UsoApp {
  return guardado === 'personal' || guardado === 'negocio' || guardado === 'vendedor' ? guardado : 'ambos';
}

export const vePersonal = (uso: UsoApp) => uso === 'personal' || uso === 'ambos';
export const veNegocio = (uso: UsoApp) => uso !== 'personal';

/** Uso de la app de quien inició sesión. `null` mientras carga el perfil (para no redirigir antes de tiempo). */
export function useUsoApp(): UsoApp | null {
  const perfil = usePerfil();
  return perfil ? usoDeApp(perfil.usage) : null;
}
