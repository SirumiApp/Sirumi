// Códigos de descuento (D7) e informe de ventas (D8). Funciones puras.

import { dentroDe, type Fecha, type Periodo } from './fechas';
import type { Descuento } from './pos';

export type CodigoDescuento = { id: string; codigo: string; tipo: 'porcentaje' | 'monto'; valor: number; activo: boolean; vence: Fecha | null };

/** "  navidad10 " → "NAVIDAD10". */
export function normalizarCodigo(texto: string): string {
  return texto.trim().toUpperCase().replace(/\s+/g, '');
}

/** D7 · El descuento de un código, si está activo y no ha vencido (vence al terminar el día). */
export function aplicarCodigo(texto: string, lista: CodigoDescuento[], hoy: Fecha): { codigo: string; descuento: Exclude<Descuento, null> } | null {
  const codigo = normalizarCodigo(texto);
  const c = lista.find((x) => x.codigo === codigo);
  if (!c || !c.activo || (c.vence && c.vence < hoy)) return null;
  return { codigo: c.codigo, descuento: { tipo: c.tipo, valor: c.valor } };
}

export function validarCodigoDescuento(d: { codigo: string; tipo: 'porcentaje' | 'monto'; valor: number }, existentes: CodigoDescuento[], id?: string) {
  const codigo = normalizarCodigo(d.codigo);
  if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return 'codigoDescuentoFormato' as const;
  if (existentes.some((x) => x.codigo === codigo && x.id !== id)) return 'codigoDescuentoRepetido' as const;
  if (!d.valor || d.valor <= 0 || (d.tipo === 'porcentaje' && d.valor > 100)) return 'codigoDescuentoValor' as const;
  return null;
}

export type LineaInforme = { variante: string | null; nombre: string; cantidad: number; total: number; costo: number | null };
export type VentaInforme = {
  id: string;
  fecha: Fecha;
  estado: string;
  total: number;
  descuento: number;
  vendedor: string | null;
  cliente: string | null;
  pagos: { nombre: string; monto: number }[];
  /** D4b · Plata devuelta por partes. */
  devuelto?: number;
  lineas: LineaInforme[];
};

const ordenar = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
const sumar = <K,>(m: Map<K, number>, k: K, v: number) => m.set(k, (m.get(k) ?? 0) + v);

/** D8 · Resumen del período, por producto, por forma de pago, por vendedor y por cliente (sin las devueltas). */
export function informeVentas(ventas: VentaInforme[], periodo: Periodo) {
  const delPeriodo = ventas.filter((v) => dentroDe(v.fecha, periodo));
  const validas = delPeriodo.filter((v) => v.estado !== 'devuelta');
  const devueltas = delPeriodo.filter((v) => v.estado === 'devuelta');
  const total = validas.reduce((s, v) => s + v.total, 0);

  const productos = new Map<string, { clave: string; nombre: string; unidades: number; ventas: number; costo: number; costoConocido: boolean }>();
  const porForma = new Map<string, number>();
  const porVendedor = new Map<string | null, number>();
  const porCliente = new Map<string, number>();
  for (const v of validas) {
    for (const l of v.lineas) {
      const clave = l.variante ?? `libre:${l.nombre}`;
      const p = productos.get(clave) ?? { clave, nombre: l.nombre, unidades: 0, ventas: 0, costo: 0, costoConocido: true };
      p.unidades += l.cantidad;
      p.ventas += l.total;
      if (l.costo === null) p.costoConocido = false;
      else p.costo += l.costo * l.cantidad;
      productos.set(clave, p);
    }
    for (const pago of v.pagos) sumar(porForma, pago.nombre, pago.monto);
    sumar(porVendedor, v.vendedor, v.total);
    if (v.cliente) sumar(porCliente, v.cliente, v.total);
  }

  return {
    resumen: {
      ventas: total,
      numero: validas.length,
      ticket: validas.length ? Math.round(total / validas.length) : 0,
      descuentos: validas.reduce((s, v) => s + v.descuento, 0),
      unidades: validas.reduce((s, v) => s + v.lineas.reduce((t, l) => t + l.cantidad, 0), 0),
      devueltas: devueltas.length,
      // Devueltas completas (su total) más lo devuelto por partes (D4b).
      montoDevuelto: devueltas.reduce((s, v) => s + v.total, 0) + delPeriodo.reduce((s, v) => s + (v.devuelto ?? 0), 0),
    },
    porProducto: [...productos.values()]
      .sort((a, b) => b.unidades - a.unidades || b.ventas - a.ventas)
      .map((p) => ({ clave: p.clave, nombre: p.nombre, unidades: p.unidades, ventas: p.ventas, ganancia: p.costoConocido ? p.ventas - p.costo : null })),
    porForma: ordenar(porForma),
    porVendedor: ordenar(porVendedor),
    porCliente: ordenar(porCliente),
  };
}
