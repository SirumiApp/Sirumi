// Vendedores del negocio (dueño): invitaciones con código y quiénes venden.

import { modoEjemploActivo, sinGuardar } from '@/ejemplo/modo';
import { supabase } from '@/lib/supabase';

export type Vendedor = { usuario: string; nombre: string; bodega: string | null; desde: string };
export type Invitacion = { id: string; codigo: string; nombre: string; bodega: string | null; vence: string };

export async function cargarVendedores(negocioId: string): Promise<{ vendedores: Vendedor[]; invitaciones: Invitacion[] }> {
  const [miembros, invitaciones] = await Promise.all([
    supabase.from('business_members').select('user_id, display_name, warehouse_id, created_at').eq('business_id', negocioId).eq('role', 'seller').order('created_at'),
    supabase.from('business_invites').select('id, code, display_name, warehouse_id, expires_at').eq('business_id', negocioId).is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
  ]);
  return {
    vendedores: (miembros.data ?? []).map((m) => ({ usuario: m.user_id, nombre: m.display_name ?? '—', bodega: m.warehouse_id, desde: m.created_at })),
    invitaciones: (invitaciones.data ?? []).map((i) => ({ id: i.id, codigo: i.code, nombre: i.display_name, bodega: i.warehouse_id, vence: i.expires_at })),
  };
}

export function crearInvitacion(negocioId: string, nombre: string, bodega: string | null) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('crear_invitacion', { negocio: negocioId, nombre: nombre.trim(), bodega: bodega ?? undefined });
}

export function borrarInvitacion(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('business_invites').delete().eq('id', id);
}

export function quitarVendedor(negocioId: string, usuario: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('quitar_vendedor', { negocio: negocioId, usuario });
}

/** Para alguien que ya tiene cuenta: unirse con el código (Ajustes). */
export function unirseConCodigo(codigo: string) {
  return supabase.rpc('unirse_con_codigo', { codigo: codigo.trim().toUpperCase() });
}
