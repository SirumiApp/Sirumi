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

/** Movimientos personales entre dos fechas (incluidas). */
export function useMovimientos(desde: Fecha, hasta: Fecha) {
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
  }, [idUsuario, desde, hasta]);

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
