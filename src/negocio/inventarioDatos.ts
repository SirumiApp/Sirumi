// Productos, bodegas y stock del negocio (spec 04). Los cambios de stock van por funciones de la base de datos.

import { modoEjemploActivo, sinGuardar } from '@/ejemplo/modo';
import type { Json } from '@/lib/database.types';
import { nombreVariante, type FilaStock } from '@/lib/inventario';
import { supabase } from '@/lib/supabase';

export type Bodega = { id: string; nombre: string; principal: boolean };
export type VarianteProducto = { id: string; color: string | null; talla: string | null; codigo: string | null; nombre: string };
export type DesgloseCosto = { materia: number; manoDeObra: number; empaque: number; otros: number };
export type Producto = {
  id: string;
  nombre: string;
  coleccion: string | null;
  emoji: string;
  precio: number;
  costo: number;
  desglose: DesgloseCosto | null;
  minimo: number;
  variantes: VarianteProducto[];
};
export type DatosInventario = { bodegas: Bodega[]; productos: Producto[]; stock: FilaStock[] };

/** Lee bodegas, productos con sus variantes y el stock de un negocio. */
export async function cargarInventario(negocioId: string): Promise<DatosInventario> {
  const [bodegas, productos, stock] = await Promise.all([
    supabase.from('warehouses').select('id, name, is_main').eq('business_id', negocioId).order('created_at'),
    supabase
      .from('products')
      .select('id, name, collection, emoji, price, cost, cost_breakdown, min_stock, product_variants(id, color, size, barcode, position)')
      .eq('business_id', negocioId)
      .order('name'),
    supabase.from('stock').select('variant_id, warehouse_id, quantity').eq('business_id', negocioId),
  ]);
  return {
    bodegas: (bodegas.data ?? []).map((b) => ({ id: b.id, nombre: b.name, principal: b.is_main })),
    productos: (productos.data ?? []).map((p) => ({
      id: p.id,
      nombre: p.name,
      coleccion: p.collection,
      emoji: p.emoji,
      precio: p.price,
      costo: p.cost,
      desglose: (p.cost_breakdown as DesgloseCosto | null) ?? null,
      minimo: p.min_stock,
      variantes: [...(p.product_variants ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((v) => ({ id: v.id, color: v.color, talla: v.size, codigo: v.barcode, nombre: nombreVariante({ color: v.color, talla: v.size }) })),
    })),
    stock: (stock.data ?? []).map((s) => ({ variante: s.variant_id, bodega: s.warehouse_id, cantidad: s.quantity })),
  };
}

/** Error de una función de inventario: código (p. ej. 'stockInsuficiente') y su detalle. */
export function leerErrorInventario(error: { message?: string; details?: string | null } | null): { codigo: string; detalle: Record<string, unknown> } | null {
  if (!error) return null;
  let detalle: Record<string, unknown> = {};
  try {
    detalle = error.details ? JSON.parse(error.details) : {};
  } catch {
    detalle = {};
  }
  return { codigo: error.message ?? 'desconocido', detalle };
}

export type NuevoProducto = {
  nombre: string;
  coleccion: string;
  emoji: string;
  precio: number;
  costo: number;
  desglose: DesgloseCosto | null;
  minimo: number;
  bodega: string | null;
  variantes: { color: string | null; talla: string | null; codigo: string; cantidad: number }[];
};

/** Crea el producto con sus variantes y el inventario inicial, todo junto (función crear_producto). */
export function crearProducto(negocioId: string, p: NuevoProducto) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('crear_producto', {
    datos: {
      business_id: negocioId,
      name: p.nombre.trim(),
      collection: p.coleccion.trim(),
      emoji: p.emoji,
      price: Math.round(p.precio),
      cost: Math.round(p.costo),
      cost_breakdown: p.desglose,
      min_stock: p.minimo,
      warehouse_id: p.bodega,
      variants: p.variantes.map((v) => ({ color: v.color, size: v.talla, barcode: v.codigo.trim() || null, quantity: v.cantidad })),
    } as unknown as Json,
  });
}

export function actualizarProducto(id: string, c: { nombre: string; coleccion: string; emoji: string; precio: number; costo: number; desglose: DesgloseCosto | null; minimo: number }) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase
    .from('products')
    .update({
      name: c.nombre.trim(),
      collection: c.coleccion.trim() || null,
      emoji: c.emoji,
      price: Math.round(c.precio),
      cost: Math.round(c.costo),
      cost_breakdown: c.desglose as unknown as Json,
      min_stock: c.minimo,
    })
    .eq('id', id);
}

export function borrarProducto(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('products').delete().eq('id', id);
}

export function agregarVariante(negocioId: string, productoId: string, v: { color: string | null; talla: string | null; codigo: string | null; posicion: number }) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('product_variants').insert({ business_id: negocioId, product_id: productoId, color: v.color, size: v.talla, barcode: v.codigo, position: v.posicion });
}

export function cambiarCodigo(varianteId: string, codigo: string | null) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('product_variants').update({ barcode: codigo?.trim() || null }).eq('id', varianteId);
}

export function quitarVariante(varianteId: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('quitar_variante', { variante: varianteId });
}

/** Entrada (cantidad > 0) o salida (< 0) en una bodega (C3). */
export function moverInventario(varianteId: string, bodegaId: string, cantidad: number, motivo: string | null, nota?: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('mover_inventario', { variante: varianteId, bodega: bodegaId, cantidad, motivo: motivo ?? undefined, nota: nota ?? undefined });
}

/** C4 · Mover unidades entre bodegas. */
export function trasladarInventario(varianteId: string, desde: string, hacia: string, cantidad: number) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('trasladar_inventario', { variante: varianteId, desde, hacia, cantidad });
}

export function deshacerMovimientoInventario(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('deshacer_movimiento_inventario', { movimiento: id });
}

export type MovInventario = { id: string; variante: string; bodega: string | null; tipo: string; cantidad: number; motivo: string | null; nota: string | null; deshecho: boolean; fecha: string };

/** Últimos movimientos de inventario (de unas variantes, o de todo el negocio). */
export async function movimientosDeInventario(negocioId: string, variantes?: string[], limite = 30): Promise<MovInventario[]> {
  let q = supabase
    .from('inventory_movements')
    .select('id, variant_id, warehouse_id, kind, quantity, reason, note, undone, created_at')
    .eq('business_id', negocioId)
    .order('created_at', { ascending: false })
    .limit(limite);
  if (variantes) q = q.in('variant_id', variantes);
  const { data } = await q;
  return (data ?? []).map((m) => ({
    id: m.id,
    variante: m.variant_id,
    bodega: m.warehouse_id,
    tipo: m.kind,
    cantidad: m.quantity,
    motivo: m.reason,
    nota: m.note,
    deshecho: m.undone,
    fecha: m.created_at,
  }));
}

export function crearBodega(negocioId: string, nombre: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('warehouses').insert({ business_id: negocioId, name: nombre.trim() });
}

export function renombrarBodega(id: string, nombre: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('warehouses').update({ name: nombre.trim() }).eq('id', id);
}

export function quitarBodega(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('quitar_bodega', { bodega: id });
}

export function hacerPrincipal(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('hacer_principal', { bodega: id });
}

/** Productos en la forma que usan las reglas C5 (valor y por reponer). */
export function paraReglas(productos: Producto[]) {
  return productos.map((p) => ({ id: p.id, precio: p.precio, costo: p.costo, minimo: p.minimo, variantes: p.variantes.map((v) => v.id) }));
}
