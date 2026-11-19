// Pagos recurrentes (B10) y clientes y proveedores (B11) del negocio. Funciones puras.

import { armarFecha, diasDelMes, diasEntre, partes, type Fecha } from './fechas';
import type { MovNegocio } from './negocio';
import { validarCorreo } from './validacion';

export type Recurrente = { id: string; nombre: string; tipo: 'fijo' | 'variable'; monto: number; dia: number; activo: boolean; cuenta?: string | null; categoria?: string | null };
/** Lo mínimo de un movimiento para saber si un pago recurrente ya se hizo (negocio o personal). */
export type PagoHecho = { fecha: Fecha; recurrente?: string | null };
export type EstadoRecurrente = 'pagado' | 'vencido' | 'hoy' | 'proximo' | 'despues';

/** Días de anticipación con los que un pago se vuelve "próximo". */
export const DIAS_AVISO = 5;

/** B10 · Estado del pago este mes. `fecha` es el día en que vence este mes; `dias` cuánto falta (negativo si ya pasó). */
export function estadoRecurrente(r: Recurrente, movs: PagoHecho[], hoy: Fecha): { estado: EstadoRecurrente; fecha: Fecha; dias: number } {
  const { anio, mes } = partes(hoy);
  const fecha = armarFecha(anio, mes, Math.min(r.dia, diasDelMes(anio, mes)));
  const dias = diasEntre(hoy, fecha);
  const mesActual = hoy.slice(0, 7);
  if (movs.some((m) => m.recurrente === r.id && m.fecha.slice(0, 7) === mesActual)) return { estado: 'pagado', fecha, dias };
  const estado: EstadoRecurrente = dias < 0 ? 'vencido' : dias === 0 ? 'hoy' : dias <= DIAS_AVISO ? 'proximo' : 'despues';
  return { estado, fecha, dias };
}

/** B10 · Cuántos pagos faltan este mes, por cuánto, el total mensual y cuántos son urgentes (vencidos o de hoy). */
export function resumenRecurrentes(lista: Recurrente[], movs: PagoHecho[], hoy: Fecha) {
  const activos = lista.filter((r) => r.activo);
  const estados = activos.map((r) => ({ r, e: estadoRecurrente(r, movs, hoy).estado }));
  const pendientes = estados.filter((x) => x.e !== 'pagado');
  return {
    faltan: pendientes.length,
    montoFaltante: pendientes.reduce((s, x) => s + x.r.monto, 0),
    totalMensual: activos.reduce((s, r) => s + r.monto, 0),
    urgentes: pendientes.filter((x) => x.e === 'vencido' || x.e === 'hoy').length,
  };
}

export function validarRecurrente(d: { nombre: string; monto: number; dia: number }) {
  if (!d.nombre.trim()) return 'recurrenteSinNombre' as const;
  if (!d.monto || d.monto <= 0) return 'recurrenteSinMonto' as const;
  if (!Number.isInteger(d.dia) || d.dia < 1 || d.dia > 31) return 'recurrenteDia' as const;
  return null;
}

/** B11 · Cuántos movimientos tiene un contacto, por cuánto y cuánto está pendiente. */
export function estadisticasContacto(contacto: string, movs: MovNegocio[]) {
  const suyos = movs.filter((m) => m.contacto === contacto);
  return {
    movimientos: suyos.length,
    total: suyos.reduce((s, m) => s + m.monto, 0),
    pendiente: suyos.filter((m) => !m.pagado).reduce((s, m) => s + m.monto, 0),
  };
}

/** B11 · Guardar un contacto exige nombre y autorización (Ley 1581); el correo, si está, debe ser válido. */
export function validarContacto(d: { nombre: string; autoriza: boolean; correo: string }) {
  if (!d.nombre.trim()) return 'contactoSinNombre' as const;
  if (!d.autoriza) return 'contactoSinAutorizacion' as const;
  if (d.correo.trim()) return validarCorreo(d.correo);
  return null;
}

/**
 * B11b · Clientes frecuentes: cuánto ha comprado cada cliente (sus ventas, cobradas o no), cuántas veces y la última fecha.
 * Ordenados de mayor a menor. `dormido` = hace más de `dias` días que no compra.
 */
export function clientesFrecuentes(movs: Pick<MovNegocio, 'tipo' | 'monto' | 'fecha' | 'contacto' | 'venta'>[], hoy: Fecha, dias = 45) {
  const porCliente = new Map<string, { id: string; total: number; compras: Set<string>; ultima: Fecha }>();
  for (const m of movs) {
    if (m.tipo !== 'venta' || !m.contacto) continue;
    const c = porCliente.get(m.contacto) ?? { id: m.contacto, total: 0, compras: new Set<string>(), ultima: m.fecha };
    c.total += m.monto;
    // Una venta del POS dividida en dos pagos cuenta como una compra.
    c.compras.add(m.venta ?? `${m.fecha}-${c.compras.size}`);
    if (m.fecha > c.ultima) c.ultima = m.fecha;
    porCliente.set(m.contacto, c);
  }
  return [...porCliente.values()]
    .map((c) => ({ id: c.id, total: c.total, compras: c.compras.size, ultima: c.ultima, diasSinComprar: diasEntre(c.ultima, hoy), dormido: diasEntre(c.ultima, hoy) > dias }))
    .sort((a, b) => b.total - a.total);
}
