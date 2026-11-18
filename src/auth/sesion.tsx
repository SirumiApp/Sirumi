import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Json } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

/** Onboarding guardado en el celular mientras la persona confirma su correo. */
const CLAVE_ONBOARDING_PENDIENTE = 'sirumi.onboarding.pendiente';

type EstadoSesion = {
  sesion: Session | null;
  cargando: boolean;
  /** null mientras se averigua; solo tiene sentido con sesión. */
  onboardingListo: boolean | null;
  /** true mientras la persona está dentro del onboarding (evita que la saque antes del paso final). */
  enOnboarding: boolean;
  setEnOnboarding: (valor: boolean) => void;
  marcarOnboardingListo: () => void;
};

const SesionContexto = createContext<EstadoSesion>({
  sesion: null,
  cargando: true,
  onboardingListo: null,
  enOnboarding: false,
  setEnOnboarding: () => {},
  marcarOnboardingListo: () => {},
});

/** Guarda quién inició sesión, si ya terminó el onboarding, y avisa cuando entra o sale. */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  // Se guarda junto con el usuario al que corresponde, para no confundir cuentas al cambiar de sesión.
  const [estadoOnboarding, setEstadoOnboarding] = useState<{ usuario: string; listo: boolean } | null>(null);
  const [enOnboarding, setEnOnboarding] = useState(false);
  const idUsuario = sesion?.user.id;
  const onboardingListo = idUsuario && estadoOnboarding?.usuario === idUsuario ? estadoOnboarding.listo : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargandoSesion(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSesion(nueva);
      setCargandoSesion(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Al entrar: ¿ya terminó el onboarding? Si quedó uno pendiente (confirmación de correo), se guarda ahora.
  useEffect(() => {
    if (!idUsuario) return;
    let vigente = true;
    const setOnboardingListo = (listo: boolean) => setEstadoOnboarding({ usuario: idUsuario, listo });
    (async () => {
      const { data, error } = await supabase.from('profiles').select('onboarded_at').eq('id', idUsuario).maybeSingle();
      if (!vigente) return;
      if (error) return setOnboardingListo(true); // Sin conexión no bloqueamos la app.
      if (data?.onboarded_at) return setOnboardingListo(true);

      const pendiente = await leerOnboardingPendiente();
      if (pendiente) {
        const { error: errorGuardar } = await supabase.rpc('completar_onboarding', { datos: pendiente });
        if (!errorGuardar) {
          await AsyncStorage.removeItem(CLAVE_ONBOARDING_PENDIENTE);
          if (vigente) setOnboardingListo(true);
          return;
        }
      }
      if (vigente) setOnboardingListo(false);
    })();
    return () => {
      vigente = false;
    };
  }, [idUsuario]);

  const marcarOnboardingListo = useCallback(() => {
    if (idUsuario) setEstadoOnboarding({ usuario: idUsuario, listo: true });
    setEnOnboarding(false);
  }, [idUsuario]);

  const valor = useMemo<EstadoSesion>(
    () => ({
      sesion,
      cargando: cargandoSesion || (!!sesion && onboardingListo === null),
      onboardingListo,
      enOnboarding,
      setEnOnboarding,
      marcarOnboardingListo,
    }),
    [sesion, cargandoSesion, onboardingListo, enOnboarding, marcarOnboardingListo],
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): EstadoSesion {
  return useContext(SesionContexto);
}

export function cerrarSesion() {
  return supabase.auth.signOut();
}

export async function guardarOnboardingPendiente(datos: Json) {
  await AsyncStorage.setItem(CLAVE_ONBOARDING_PENDIENTE, JSON.stringify(datos));
}

async function leerOnboardingPendiente(): Promise<Json | null> {
  try {
    const texto = await AsyncStorage.getItem(CLAVE_ONBOARDING_PENDIENTE);
    return texto ? (JSON.parse(texto) as Json) : null;
  } catch {
    return null;
  }
}
