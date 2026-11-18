import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type EstadoSesion = { sesion: Session | null; cargando: boolean };

const SesionContexto = createContext<EstadoSesion>({ sesion: null, cargando: true });

/** Guarda quién inició sesión y avisa cuando entra o sale. */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>({ sesion: null, cargando: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEstado({ sesion: data.session, cargando: false }));
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setEstado({ sesion, cargando: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SesionContexto.Provider value={estado}>{children}</SesionContexto.Provider>;
}

export function useSesion(): EstadoSesion {
  return useContext(SesionContexto);
}

export function cerrarSesion() {
  return supabase.auth.signOut();
}
