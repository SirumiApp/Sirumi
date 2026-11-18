import { useEffect, useState } from 'react';

import type { Json, Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { useSesion } from './sesion';

export type Perfil = Tables<'profiles'>;

// Cuando algo cambia el perfil (país, preferencias…), todas las pantallas que lo muestran vuelven a leerlo.
const oyentes = new Set<() => void>();
export function avisarCambioPerfil() {
  oyentes.forEach((oyente) => oyente());
}

/** Lee el perfil de la persona que inició sesión (las reglas RLS solo dejan ver el propio). */
export function usePerfil(): Perfil | null {
  const { sesion } = useSesion();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [version, setVersion] = useState(0);
  const idUsuario = sesion?.user.id;

  useEffect(() => {
    const oyente = () => setVersion((v) => v + 1);
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  }, []);

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
  }, [idUsuario, version]);

  return idUsuario ? perfil : null;
}

/** "Nicolás Andrés Niño" → "Nicolás". */
export function primerNombre(nombreCompleto: string | null | undefined): string | null {
  const primero = nombreCompleto?.trim().split(/\s+/)[0];
  return primero ? primero : null;
}

/** Cambia algunas preferencias del perfil sin borrar las demás, y avisa a las pantallas. */
export async function actualizarPreferencias(idUsuario: string, actuales: unknown, cambios: Record<string, unknown>) {
  const base = (actuales && typeof actuales === 'object' ? actuales : {}) as Record<string, unknown>;
  const resultado = await supabase.from('profiles').update({ preferences: { ...base, ...cambios } as Json }).eq('id', idUsuario);
  avisarCambioPerfil();
  return resultado;
}

/** Cambia datos del perfil (país, moneda…) y avisa a las pantallas. */
export async function actualizarPerfil(idUsuario: string, cambios: { country?: string; currency?: string }) {
  const resultado = await supabase.from('profiles').update(cambios).eq('id', idUsuario);
  avisarCambioPerfil();
  return resultado;
}
