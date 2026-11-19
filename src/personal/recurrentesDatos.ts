import { esTextoEjemplo, pagosPersonalesEjemplo, RECURRENTES_PERSONALES_EJEMPLO } from '@/ejemplo/datosEjemplo';
import { modoEjemploActivo, sinGuardar } from '@/ejemplo/modo';
import type { PagoHecho, Recurrente } from '@/lib/contactos';
import { hoyEn } from '@/lib/fechas';
import { supabase } from '@/lib/supabase';

/** B10 en personal: los pagos fijos de la persona y los que ya hizo este mes. */
export async function cargarRecurrentesPersonales(traducir: (clave: string) => string): Promise<{ recurrentes: Recurrente[]; pagos: PagoHecho[] }> {
  const hoy = hoyEn();
  if (modoEjemploActivo()) {
    return {
      recurrentes: RECURRENTES_PERSONALES_EJEMPLO.map((r) => ({ ...r, nombre: esTextoEjemplo(r.nombre) ? traducir(r.nombre) : r.nombre })),
      pagos: pagosPersonalesEjemplo(hoy),
    };
  }
  const [recurrentes, pagos] = await Promise.all([
    supabase.from('recurring_payments').select('id, name, amount, day_of_month, category_id, active').eq('owner_type', 'personal').order('day_of_month'),
    supabase.from('movements').select('date, recurring_id').eq('owner_type', 'personal').not('recurring_id', 'is', null).gte('date', `${hoy.slice(0, 7)}-01`),
  ]);
  return {
    recurrentes: (recurrentes.data ?? []).map((r) => ({ id: r.id, nombre: r.name, tipo: 'fijo', monto: r.amount, dia: r.day_of_month, activo: r.active, categoria: r.category_id })),
    pagos: (pagos.data ?? []).map((m) => ({ fecha: m.date, recurrente: m.recurring_id })),
  };
}

export function guardarRecurrentePersonal(idUsuario: string, r: Omit<Recurrente, 'id' | 'tipo' | 'cuenta'>, id?: string) {
  if (modoEjemploActivo()) return sinGuardar();
  const fila = { name: r.nombre.trim(), amount: Math.round(r.monto), day_of_month: r.dia, category_id: r.categoria ?? null, active: r.activo };
  return id
    ? supabase.from('recurring_payments').update(fila).eq('id', id)
    : supabase.from('recurring_payments').insert({ ...fila, owner_type: 'personal', user_id: idUsuario, kind: 'fijo' });
}
