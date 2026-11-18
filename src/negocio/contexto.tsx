import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { hoyEn } from '@/lib/fechas';
import type { MovNegocio } from '@/lib/negocio';

import { useDatosNegocio, type DatosNegocio } from './datos';
import { HojaMovNegocio } from './HojaMovNegocio';

type ContextoNegocio = DatosNegocio & {
  version: number;
  actualizar: () => void;
  /** Abre la hoja para registrar (sin movimiento) o editar (con movimiento). */
  abrirHoja: (movimiento: MovNegocio | null) => void;
};

const Contexto = createContext<ContextoNegocio | null>(null);

/** Datos del negocio compartidos por Resumen, Caja y demás, y la hoja de registrar (la abre el + en Negocio). */
export function ProveedorNegocio({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [hoja, setHoja] = useState<{ abierta: boolean; movimiento: MovNegocio | null }>({ abierta: false, movimiento: null });
  const datos = useDatosNegocio(version);
  const actualizar = useCallback(() => setVersion((v) => v + 1), []);
  const abrirHoja = useCallback((movimiento: MovNegocio | null) => setHoja({ abierta: true, movimiento }), []);
  const { negocio, cuentas, tarjetas, movimientos, traslados, cargando } = datos;

  const valor = useMemo(
    () => ({ negocio, cuentas, tarjetas, movimientos, traslados, cargando, version, actualizar, abrirHoja }),
    [negocio, cuentas, tarjetas, movimientos, traslados, cargando, version, actualizar, abrirHoja],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <HojaMovNegocio
        abierta={hoja.abierta}
        movimiento={hoja.movimiento}
        negocioId={negocio?.id ?? null}
        cuentas={cuentas}
        tarjetas={tarjetas}
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

export function useNegocio(): ContextoNegocio {
  const datos = useContext(Contexto);
  if (!datos) throw new Error('useNegocio debe usarse dentro de ProveedorNegocio');
  return datos;
}
