import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { avisarEjemplo, modoEjemploActivo } from '@/ejemplo/modo';
import { hoyEn, partes } from '@/lib/fechas';
import type { ParametrosImpuestos } from '@/lib/impuestos';
import type { MovNegocio } from '@/lib/negocio';

import { cargarParametrosImpuestos, useDatosNegocio, type DatosMovNegocio, type DatosNegocio } from './datos';
import { HojaMovNegocio } from './HojaMovNegocio';

type ContextoNegocio = DatosNegocio & {
  version: number;
  /** Tarifas y UVT del año (B7); null mientras cargan o si no hay. */
  parametros: ParametrosImpuestos | null;
  actualizar: () => void;
  /** Abre la hoja para registrar (sin movimiento) o editar (con movimiento). `plantilla` llena un registro nuevo (p. ej. un pago recurrente). */
  abrirHoja: (movimiento: MovNegocio | null, plantilla?: Partial<DatosMovNegocio>) => void;
};

const Contexto = createContext<ContextoNegocio | null>(null);

/** Datos del negocio compartidos por Resumen, Caja y demás, y la hoja de registrar (la abre el + en Negocio). */
export function ProveedorNegocio({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [hoja, setHoja] = useState<{ abierta: boolean; movimiento: MovNegocio | null; plantilla?: Partial<DatosMovNegocio> }>({ abierta: false, movimiento: null });
  const datos = useDatosNegocio(version);
  const [parametros, setParametros] = useState<ParametrosImpuestos | null>(null);
  const conNegocio = !!datos.negocio;

  useEffect(() => {
    if (conNegocio) cargarParametrosImpuestos(partes(hoyEn()).anio).then(setParametros);
  }, [conNegocio]);
  const actualizar = useCallback(() => setVersion((v) => v + 1), []);
  const abrirHoja = useCallback((movimiento: MovNegocio | null, plantilla?: Partial<DatosMovNegocio>) => {
    // En el modo ejemplo no se registra nada: se avisa y se ofrece salir.
    if (modoEjemploActivo()) return avisarEjemplo();
    setHoja({ abierta: true, movimiento, plantilla });
  }, []);
  const { negocio, cuentas, tarjetas, movimientos, traslados, contactos, recurrentes, bodegas, productos, stock, cargando } = datos;

  const valor = useMemo(
    () => ({ negocio, cuentas, tarjetas, movimientos, traslados, contactos, recurrentes, bodegas, productos, stock, cargando, version, parametros, actualizar, abrirHoja }),
    [negocio, cuentas, tarjetas, movimientos, traslados, contactos, recurrentes, bodegas, productos, stock, cargando, version, parametros, actualizar, abrirHoja],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <HojaMovNegocio
        abierta={hoja.abierta}
        movimiento={hoja.movimiento}
        plantilla={hoja.plantilla}
        contactos={contactos}
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
