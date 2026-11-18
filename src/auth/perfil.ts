import { useEffect, useState } from 'react';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { useSesion } from './sesion';

export type Perfil = Tables<'profiles'>;

/** Lee el perfil de la persona que inició sesión (las reglas RLS solo dejan ver el propio). */
export function usePerfil(): Perfil | null {
  const { sesion } = useSesion();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const idUsuario = sesion?.user.id;

  useEffect(() => {
    if (!idUsuario) return;
    let vigente = true;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', idUsuario)
      .maybeSingle()
      .then(({ data }) => {
        if (vigente) setPerfil(data);
      });
    return () => {
      vigente = false;
    };
  }, [idUsuario]);

  return idUsuario ? perfil : null;
}

/** "Nicolás Andrés Niño" → "Nicolás". */
export function primerNombre(nombreCompleto: string | null | undefined): string | null {
  const primero = nombreCompleto?.trim().split(/\s+/)[0];
  return primero ? primero : null;
}
