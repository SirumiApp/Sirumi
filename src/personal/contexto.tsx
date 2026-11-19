import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { usePerfil } from '@/auth/perfil';
import { useSesion } from '@/auth/sesion';
import { useModoEjemplo } from '@/ejemplo/modo';
import type { PagoHecho, Recurrente } from '@/lib/contactos';
import { hoyEn, periodoPredefinido } from '@/lib/fechas';
import type { Movimiento } from '@/lib/personal';

import { cruceDeTope } from '@/lib/analisis';

import { gastadoEnCategoria, guardarAlerta, leerAlerta, useCategorias, useTopes, type AlertaTopes, type Categoria } from './datos';
import { useNombreCategoria, usePlata } from './ganchos';
import { HojaMovimiento, type PlantillaMovimiento } from './HojaMovimiento';
import { cargarRecurrentesPersonales } from './recurrentesDatos';

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
  /** Abre la hoja para registrar (sin movimiento) o editar (con movimiento). `plantilla` llena uno nuevo (p. ej. un pago recurrente). */
  abrirHoja: (movimiento: Movimiento | null, plantilla?: PlantillaMovimiento) => void;
  /** B10 en personal: pagos que se repiten cada mes y los que ya se hicieron este mes. */
  recurrentes: Recurrente[];
  pagosRecurrentes: PagoHecho[];
};

const Contexto = createContext<DatosPersonales | null>(null);

/** Datos compartidos por Inicio, Análisis y Topes, y la hoja de registrar movimiento (la abre el botón + de la barra). */
export function ProveedorPersonal({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const perfil = usePerfil();
  const [version, setVersion] = useState(0);
  const [hoja, setHoja] = useState<{ abierta: boolean; movimiento: Movimiento | null; plantilla?: PlantillaMovimiento }>({ abierta: false, movimiento: null });
  const [alertaLocal, setAlertaLocal] = useState<AlertaTopes | null>(null);
  const alerta = alertaLocal ?? leerAlerta(perfil?.preferences);
  const { categorias, recargar: recargarCategorias } = useCategorias();
  const { topes } = useTopes(version);

  const actualizar = useCallback(() => setVersion((v) => v + 1), []);
  const { t } = useTranslation();
  const plata = usePlata();
  const nombreCategoria = useNombreCategoria();
  const ejemplo = useModoEjemplo();
  const [rec, setRec] = useState<{ recurrentes: Recurrente[]; pagos: PagoHecho[] }>({ recurrentes: [], pagos: [] });
  useEffect(() => {
    if (!sesion) return;
    let vigente = true;
    cargarRecurrentesPersonales((c) => t(c as never)).then((r) => vigente && setRec(r));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` cambia con el idioma; basta con la sesión, la versión y el modo
  }, [sesion?.user.id, version, ejemplo]);
  const cambiarAlerta = useCallback(
    (nueva: AlertaTopes) => {
      setAlertaLocal(nueva);
      if (sesion) guardarAlerta(sesion.user.id, perfil?.preferences, nueva);
    },
    [sesion, perfil?.preferences],
  );
  const abrirHoja = useCallback((movimiento: Movimiento | null, plantilla?: PlantillaMovimiento) => {
    // En el modo ejemplo también se puede registrar: queda solo en la memoria del celular.
    setHoja({ abierta: true, movimiento, plantilla });
  }, []);

  /** A2 · Si el gasto hizo cruzar el aviso del tope (o el tope), se avisa una vez, en la app. */
  async function avisarSiCruzaTope(g: { categoria: string; monto: number; fecha: string }) {
    const tope = topes[g.categoria];
    const hoy = hoyEn();
    if (!alerta.alertaActiva || !tope || g.fecha.slice(0, 7) !== hoy.slice(0, 7)) return;
    const { desde, hasta } = periodoPredefinido('mes', hoy);
    const despues = await gastadoEnCategoria(g.categoria, desde, hasta);
    const cruce = cruceDeTope({ gastadoAntes: despues - g.monto, monto: g.monto, tope, umbral: alerta.umbral });
    if (!cruce) return;
    const nombre = nombreCategoria(categorias.find((c) => c.id === g.categoria));
    const pct = Math.round((despues / tope) * 100);
    Alert.alert(
      t(cruce === 'tope' ? 'topes.avisoTope' : 'topes.avisoUmbral', { categoria: nombre, porcentaje: pct }),
      t('topes.avisoDetalle', { gastado: plata(despues), tope: plata(tope) }),
    );
  }

  const valor = useMemo(
    () => ({ categorias, topes, alerta, version, actualizar, recargarCategorias, cambiarAlerta, abrirHoja, recurrentes: rec.recurrentes, pagosRecurrentes: rec.pagos }),
    [categorias, topes, alerta, version, actualizar, recargarCategorias, cambiarAlerta, abrirHoja, rec],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <HojaMovimiento
        abierta={hoja.abierta}
        movimiento={hoja.movimiento}
        plantilla={hoja.plantilla}
        categorias={categorias}
        hoy={hoyEn()}
        onCerrar={() => setHoja({ abierta: false, movimiento: null })}
        onGuardado={(gasto) => {
          setHoja({ abierta: false, movimiento: null });
          actualizar();
          if (gasto) avisarSiCruzaTope(gasto);
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
