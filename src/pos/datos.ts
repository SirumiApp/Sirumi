// Datos del POS (spec 05): ventas, formas de pago propias, cobrar y devolver (funciones de la base de datos).

import { modoEjemploActivo, sinGuardar } from '@/ejemplo/modo';
import type { Json } from '@/lib/database.types';
import type { Fecha } from '@/lib/fechas';
import type { IvaVenta } from '@/lib/pos';
import { supabase } from '@/lib/supabase';

export type PagoVenta = { nombre: string; cuenta: string | null; monto: number };
export type LineaVenta = { variante: string | null; nombre: string; precio: number; costo: number | null; cantidad: number; total: number };
export type Venta = {
  id: string;
  numero: number;
  fecha: Fecha;
  bodega: string | null;
  cliente: string | null;
  subtotal: number;
  descuento: number;
  total: number;
  pagos: PagoVenta[];
  recibido: number | null;
  vuelto: number | null;
  /** IVA de la venta (D6) y si estaba incluido en los precios (null si el negocio no cobra IVA). */
  iva: number;
  tarifaIva: number | null;
  ivaIncluido: boolean | null;
  estado: 'pagada' | 'fiada' | 'devuelta';
  creada: string;
  lineas: LineaVenta[];
};
export type FormaPagoPropia = { id: string; nombre: string; cuenta: string };

/** Últimas ventas del negocio con sus líneas, y las formas de pago creadas por la persona. */
export async function cargarPos(negocioId: string): Promise<{ ventas: Venta[]; formasPago: FormaPagoPropia[] }> {
  const [ventas, formas] = await Promise.all([
    supabase
      .from('sales')
      .select('id, number, date, warehouse_id, contact_id, subtotal, discount, total, payments, received, change, tax, tax_rate, tax_included, status, created_at, sale_items(variant_id, name, unit_price, unit_cost, quantity, line_total)')
      .eq('business_id', negocioId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('payment_methods').select('id, name, account_id').eq('business_id', negocioId).order('created_at'),
  ]);
  return {
    ventas: (ventas.data ?? []).map((v) => ({
      id: v.id,
      numero: v.number,
      fecha: v.date,
      bodega: v.warehouse_id,
      cliente: v.contact_id,
      subtotal: v.subtotal,
      descuento: v.discount,
      total: v.total,
      pagos: (v.payments as unknown as PagoVenta[]) ?? [],
      recibido: v.received,
      vuelto: v.change,
      iva: v.tax,
      tarifaIva: v.tax_rate === null ? null : Number(v.tax_rate),
      ivaIncluido: v.tax_included,
      estado: v.status as Venta['estado'],
      creada: v.created_at,
      lineas: (v.sale_items ?? []).map((l) => ({ variante: l.variant_id, nombre: l.name, precio: l.unit_price, costo: l.unit_cost, cantidad: l.quantity, total: l.line_total })),
    })),
    formasPago: (formas.data ?? []).map((f) => ({ id: f.id, nombre: f.name, cuenta: f.account_id })),
  };
}

export type DatosCobro = {
  fecha: Fecha;
  bodega: string | null;
  cliente: string | null;
  descuento: number;
  recibido: number | null;
  /** D6 · null si el negocio no cobra IVA. */
  iva: IvaVenta;
  lineas: { variante: string | null; nombre: string; precio: number; cantidad: number }[];
  pagos: PagoVenta[];
};

/** Cobrar (D4): venta, líneas, plata y stock en una sola transacción. Devuelve { id, number }. */
export function cobrarVenta(negocioId: string, d: DatosCobro) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('cobrar_venta', {
    datos: {
      business_id: negocioId,
      date: d.fecha,
      warehouse_id: d.bodega,
      contact_id: d.cliente,
      discount: Math.round(d.descuento),
      received: d.recibido,
      ...(d.iva ? { iva: { tarifa: d.iva.tarifa, incluido: d.iva.incluido } } : {}),
      items: d.lineas.map((l) => ({ variant_id: l.variante, name: l.nombre, unit_price: Math.round(l.precio), quantity: l.cantidad })),
      payments: d.pagos.map((p) => ({ nombre: p.nombre, cuenta: p.cuenta, monto: Math.round(p.monto) })),
    } as unknown as Json,
  });
}

/** Devolución (D4): devuelve el stock a la misma bodega y quita la plata de la venta. */
export function devolverVenta(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('devolver_venta', { venta: id });
}

export function crearFormaPago(negocioId: string, nombre: string, cuenta: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('payment_methods').insert({ business_id: negocioId, name: nombre.trim(), account_id: cuenta }).select('id').single();
}

export function borrarFormaPago(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('payment_methods').delete().eq('id', id);
}
