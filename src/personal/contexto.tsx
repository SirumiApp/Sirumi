import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { usePerfil } from '@/auth/perfil';
import { useSesion } from '@/auth/sesion';
import { hoyEn } from '@/lib/fechas';
import type { Movimiento } from '@/lib/personal';

import { guardarAlerta, leerAlerta, useCategorias, useTopes, type AlertaTopes, type Categoria } from './datos';
import { HojaMovimiento } from './HojaMovimiento';

type DatosPersonales = {
  categorias: Categoria[];
  topes: Record<string, number>;
  alerta: AlertaTopes;
  /** Cambia cada vez que se guarda algo, para que las pantallas vuelvan a leer. */
  version: number;
  actualizar: () => void;
  /** Vuelve a leer las categorías (después de crear, renombrar u ocultar una). */
  recargarCategorias: () => void;
  cambiarAlerta: (alerta: AlertaTopes) => void;
  /** Abre la hoja para registrar (sin movimiento) o editar (con movimiento). */
  abrirHoja: (movimiento: Movimiento | null) => void;
};

const Contexto = createContext<DatosPersonales | null>(null);

/** Datos compartidos por Inicio, Análisis y Topes, y la hoja de registrar movimiento (la abre el botón + de la barra). */
export function ProveedorPersonal({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const perfil = usePerfil();
  const [version, setVersion] = useState(0);
  const [hoja, setHoja] = useState<{ abierta: boolean; movimiento: Movimiento | null }>({ abierta: false, movimiento: null });
  const [alertaLocal, setAlertaLocal] = useState<AlertaTopes | null>(null);
  const alerta = alertaLocal ?? leerAlerta(perfil?.preferences);
  const { categorias, recargar: recargarCategorias } = useCategorias();
  const { topes } = useTopes(version);

  const actualizar = useCallback(() => setVersion((v) => v + 1), []);
  const cambiarAlerta = useCallback(
    (nueva: AlertaTopes) => {
      setAlertaLocal(nueva);
      if (sesion) guardarAlerta(sesion.user.id, perfil?.preferences, nueva);
    },
    [sesion, perfil?.preferences],
  );
  const abrirHoja = useCallback((movimiento: Movimiento | null) => setHoja({ abierta: true, movimiento }), []);

  const valor = useMemo(
    () => ({ categorias, topes, alerta, version, actualizar, recargarCategorias, cambiarAlerta, abrirHoja }),
    [categorias, topes, alerta, version, actualizar, recargarCategorias, cambiarAlerta, abrirHoja],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <HojaMovimiento
        abierta={hoja.abierta}
        movimiento={hoja.movimiento}
        categorias={categorias}
        hoy={hoyEn()}
        onCerrar={() => setHoja({ abierta: false, movimiento: null })}
        onGuardado={() => {
          setHoja({ abierta: false, movimiento: null });
          actualizar();
        }}
      />
    </Contexto.Provider>
  );
}

export function usePersonal(): DatosPersonales {
  const datos = useContext(Contexto);
  if (!datos) throw new Error('usePersonal debe usarse dentro de ProveedorPersonal');
  return datos;
}
