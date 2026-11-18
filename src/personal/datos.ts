import { useCallback, useEffect, useState } from 'react';

import { useSesion } from '@/auth/sesion';
import type { Tables } from '@/lib/database.types';
import type { Fecha } from '@/lib/fechas';
import type { Movimiento, TipoMovimiento } from '@/lib/personal';
import { supabase } from '@/lib/supabase';

export type Categoria = Tables<'categories'>;

/** Lee las categorías de la persona; si es la primera vez, crea las iniciales. */
export function useCategorias() {
  const { sesion } = useSesion();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const idUsuario = sesion?.user.id;

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    await supabase.rpc('crear_categorias_iniciales');
    const { data } = await supabase.from('categories').select('*').order('position');
    setCategorias(data ?? []);
  }, [idUsuario]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde el servidor
    cargar();
  }, [cargar]);

  return { categorias, recargar: cargar };
}

/** Movimientos personales entre dos fechas (incluidas). Cambiar `version` los vuelve a leer. */
export function useMovimientos(desde: Fecha, hasta: Fecha, version = 0) {
  const { sesion } = useSesion();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const idUsuario = sesion?.user.id;

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    const { data } = await supabase
      .from('movements')
      .select('id, date, kind, amount, category_id, description')
      .eq('owner_type', 'personal')
      .gte('date', desde)
      .lte('date', hasta)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    setMovimientos(
      (data ?? []).map((m) => ({
        id: m.id,
        fecha: m.date,
        tipo: m.kind as TipoMovimiento,
        monto: m.amount,
        categoria: m.category_id ?? '',
        descripcion: m.description,
      })),
    );
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` solo sirve para forzar una nueva lectura
  }, [idUsuario, desde, hasta, version]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor al cambiar las fechas
    cargar();
  }, [cargar]);

  return { movimientos, cargando, recargar: cargar };
}

export type DatosMovimiento = {
  fecha: Fecha;
  tipo: TipoMovimiento;
  monto: number;
  categoria: string | null;
  descripcion: string;
};

export async function guardarMovimiento(datos: DatosMovimiento, id?: string) {
  const fila = {
    date: datos.fecha,
    kind: datos.tipo,
    amount: Math.round(datos.monto),
    category_id: datos.categoria,
    description: datos.descripcion.trim() || null,
  };
  return id ? supabase.from('movements').update(fila).eq('id', id) : supabase.from('movements').insert(fila);
}

export async function borrarMovimiento(id: string) {
  return supabase.from('movements').delete().eq('id', id);
}

/** Topes mensuales por categoría (id de categoría → tope). Cambiar `version` los vuelve a leer. */
export function useTopes(version = 0) {
  const { sesion } = useSesion();
  const [topes, setTopes] = useState<Record<string, number>>({});
  const idUsuario = sesion?.user.id;

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    const { data } = await supabase.from('budgets').select('category_id, monthly_limit');
    setTopes(Object.fromEntries((data ?? []).map((b) => [b.category_id, b.monthly_limit])));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` solo sirve para forzar una nueva lectura
  }, [idUsuario, version]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor
    cargar();
  }, [cargar]);

  return { topes, recargar: cargar };
}

/** Guarda el tope de una categoría; con 0 lo quita. */
export async function guardarTope(categoriaId: string, monto: number) {
  if (monto <= 0) return supabase.from('budgets').delete().eq('category_id', categoriaId);
  return supabase.from('budgets').upsert({ category_id: categoriaId, monthly_limit: Math.round(monto) }, { onConflict: 'user_id,category_id' });
}

export type AlertaTopes = { alertaActiva: boolean; umbral: number };
export const ALERTA_POR_DEFECTO: AlertaTopes = { alertaActiva: true, umbral: 80 };

/** La alerta de topes guardada en profiles.preferences.topes. */
export function leerAlerta(preferencias: unknown): AlertaTopes {
  const t = (preferencias as { topes?: { alerta?: boolean; umbral?: number } } | null)?.topes;
  return {
    alertaActiva: typeof t?.alerta === 'boolean' ? t.alerta : ALERTA_POR_DEFECTO.alertaActiva,
    umbral: typeof t?.umbral === 'number' ? t.umbral : ALERTA_POR_DEFECTO.umbral,
  };
}

export async function guardarAlerta(idUsuario: string, preferencias: unknown, alerta: AlertaTopes) {
  const actuales = (preferencias ?? {}) as Record<string, unknown>;
  return supabase
    .from('profiles')
    .update({ preferences: { ...actuales, topes: { alerta: alerta.alertaActiva, umbral: alerta.umbral } } })
    .eq('id', idUsuario);
}
