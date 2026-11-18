import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSesion } from '@/auth/sesion';
import { planPersonalEjemplo } from '@/ejemplo/datosEjemplo';
import { modoEjemploActivo, sinGuardar, useModoEjemplo } from '@/ejemplo/modo';
import { hoyEn } from '@/lib/fechas';
import { supabase } from '@/lib/supabase';

export type Meta = { id: string; nombre: string; emoji: string; objetivo: number; ahorrado: number };
export type Deuda = { id: string; nombre: string; emoji: string; saldo: number; tasaEA: number; cuota: number };
export type Activo = { id: string; nombre: string; emoji: string; valor: number };
export type Foto = { mes: string; neto: number };

/** Metas, deudas, activos y fotos del patrimonio de la persona. Cambiar `version` los vuelve a leer. */
export function usePlanPersonal(version = 0) {
  const { sesion } = useSesion();
  const idUsuario = sesion?.user.id;
  const [datos, setDatos] = useState<{ metas: Meta[]; deudas: Deuda[]; activos: Activo[]; fotos: Foto[]; cargando: boolean }>({
    metas: [],
    deudas: [],
    activos: [],
    fotos: [],
    cargando: true,
  });

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    const [metas, deudas, activos, fotos] = await Promise.all([
      supabase.from('goals').select('id, name, emoji, target, saved').order('created_at'),
      supabase.from('debts').select('id, name, emoji, balance, rate_ea, min_payment').order('created_at'),
      supabase.from('assets').select('id, name, emoji, value').order('created_at'),
      supabase.from('net_worth_snapshots').select('month, net').order('month'),
    ]);
    setDatos({
      metas: (metas.data ?? []).map((m) => ({ id: m.id, nombre: m.name, emoji: m.emoji, objetivo: m.target, ahorrado: m.saved })),
      deudas: (deudas.data ?? []).map((d) => ({
        id: d.id,
        nombre: d.name,
        emoji: d.emoji,
        saldo: d.balance,
        tasaEA: Number(d.rate_ea),
        cuota: d.min_payment,
      })),
      activos: (activos.data ?? []).map((a) => ({ id: a.id, nombre: a.name, emoji: a.emoji, valor: a.value })),
      fotos: (fotos.data ?? []).map((f) => ({ mes: f.month.slice(0, 7), neto: f.net })),
      cargando: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` solo sirve para forzar una nueva lectura
  }, [idUsuario, version]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor
    cargar();
  }, [cargar]);

  const ejemplo = useModoEjemplo();
  const { t } = useTranslation();
  const deEjemplo = useMemo(() => {
    if (!ejemplo) return null;
    const d = planPersonalEjemplo(hoyEn());
    const tx = <T extends { nombre: string }>(l: T[]) => l.map((x) => ({ ...x, nombre: t(x.nombre as never) as string }));
    return { ...d, metas: tx(d.metas), deudas: tx(d.deudas), activos: tx(d.activos) };
  }, [ejemplo, t]);
  return deEjemplo ?? datos;
}

/** Después de cualquier cambio: guarda la foto del patrimonio de este mes (A7). */
async function conFoto<T extends { error: unknown }>(promesa: PromiseLike<T>): Promise<T> {
  const resultado = await promesa;
  if (!resultado.error) await supabase.rpc('guardar_foto_patrimonio');
  return resultado;
}

export function guardarMeta(d: { nombre: string; emoji: string; objetivo: number; ahorrado: number }, id?: string) {
  if (modoEjemploActivo()) return sinGuardar();
  const fila = { name: d.nombre.trim(), emoji: d.emoji, target: Math.round(d.objetivo), saved: Math.min(Math.round(d.ahorrado), Math.round(d.objetivo)) };
  return conFoto(id ? supabase.from('goals').update(fila).eq('id', id) : supabase.from('goals').insert(fila));
}

export function guardarDeuda(d: { nombre: string; emoji: string; saldo: number; tasaEA: number; cuota: number }, id?: string) {
  if (modoEjemploActivo()) return sinGuardar();
  const fila = { name: d.nombre.trim(), emoji: d.emoji, balance: Math.round(d.saldo), rate_ea: d.tasaEA, min_payment: Math.round(d.cuota) };
  return conFoto(id ? supabase.from('debts').update(fila).eq('id', id) : supabase.from('debts').insert(fila));
}

export function guardarActivo(d: { nombre: string; emoji: string; valor: number }, id?: string) {
  if (modoEjemploActivo()) return sinGuardar();
  const fila = { name: d.nombre.trim(), emoji: d.emoji, value: Math.round(d.valor) };
  return conFoto(id ? supabase.from('assets').update(fila).eq('id', id) : supabase.from('assets').insert(fila));
}

export function borrarDelPlan(tabla: 'goals' | 'debts' | 'assets', id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return conFoto(supabase.from(tabla).delete().eq('id', id));
}

/** A5 · El servidor aplica la regla: nunca supera el objetivo. */
export function abonarMeta(id: string, monto: number) {
  if (modoEjemploActivo()) return sinGuardar();
  return conFoto(supabase.rpc('abonar_meta', { meta: id, monto: Math.round(monto) }));
}

/** A6 · El servidor aplica la regla: el saldo nunca queda negativo. */
export function abonarDeuda(id: string, monto: number) {
  if (modoEjemploActivo()) return sinGuardar();
  return conFoto(supabase.rpc('abonar_deuda', { deuda: id, monto: Math.round(monto) }));
}
