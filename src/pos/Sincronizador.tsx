import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useNegocio } from '@/negocio/contexto';

import { subirPendientes, useVentasPendientes } from './cola';

/** Sube las ventas hechas sin internet: al abrir la app, al volver a ella y cada 30 s mientras queden. */
export function SincronizadorVentas() {
  const { negocio, actualizar } = useNegocio();
  const pendientes = useVentasPendientes(negocio?.id).filter((v) => !v.error).length;

  useEffect(() => {
    if (pendientes === 0) return;
    const intentar = () =>
      subirPendientes().then((n) => {
        if (n > 0) actualizar();
      });
    intentar();
    const reloj = setInterval(intentar, 30_000);
    const s = AppState.addEventListener('change', (e) => e === 'active' && intentar());
    return () => {
      clearInterval(reloj);
      s.remove();
    };
  }, [pendientes, actualizar]);

  return null;
}
