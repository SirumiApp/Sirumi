// Sirumi POS (docs/reglas-de-calculo.md, sección D). Funciones puras: la venta real la guarda la base de datos
// en una sola transacción (función cobrar_venta).

import { dentroDe, type Fecha, type Periodo } from './fechas';

/** Una línea del carrito. `variante` null = venta libre (sin producto ni stock). */
export type LineaCarrito = { clave: string; variante: string | null; nombre: string; precio: number; cantidad: number; costo?: number | null };
export type Descuento = { tipo: 'porcentaje' | 'monto'; valor: number } | null;

/** IVA de la venta (D6): tarifa en % y si los precios ya lo incluyen (lo normal). null = el negocio no cobra IVA. */
export type IvaVenta = { tarifa: number; incluido: boolean } | null;

/**
 * D1 + D6 · Subtotal, descuento (porcentaje redondeado o monto, nunca más que el subtotal), base, IVA y total.
 * IVA incluido: el total no cambia y se le saca el IVA. Sumar IVA: el IVA va encima del valor con descuento.
 */
export function totalesVenta(lineas: LineaCarrito[], descuento: Descuento, iva: IvaVenta = null) {
  const subtotal = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const crudo = !descuento ? 0 : descuento.tipo === 'porcentaje' ? Math.round((subtotal * descuento.valor) / 100) : Math.round(descuento.valor);
  const d = Math.min(subtotal, Math.max(0, crudo));
  const neto = subtotal - d;
  if (!iva || iva.tarifa <= 0) return { subtotal, descuento: d, base: neto, iva: 0, total: neto };
  if (iva.incluido) {
    const base = Math.round(neto / (1 + iva.tarifa / 100));
    return { subtotal, descuento: d, base, iva: neto - base, total: neto };
  }
  const impuesto = Math.round((neto * iva.tarifa) / 100);
  return { subtotal, descuento: d, base: neto, iva: impuesto, total: neto + impuesto };
}

/** D2 · ¿Cabe una unidad más de esta variante, según lo disponible en la bodega de venta? */
export function cabeEnCarrito(variante: string | null, disponible: number, carrito: LineaCarrito[]): boolean {
  if (!variante) return true;
  const enCarrito = carrito.filter((l) => l.variante === variante).reduce((s, l) => s + l.cantidad, 0);
  return enCarrito + 1 <= disponible;
}

/** D3 · Vuelto en efectivo. */
export function vuelto(recibido: number, total: number): number {
  return Math.max(0, recibido - total);
}

/** D3 · Pago dividido: primera parte = redondear(total × %); la segunda completa el total. */
export function dividirPago(total: number, porcentaje: number): [number, number] {
  const primera = Math.round((total * porcentaje) / 100);
  return [primera, total - primera];
}

/** "¿Con cuánto paga?": exacto y los siguientes redondeos con billetes colombianos (10.000, 20.000, 50.000, 100.000). */
export function sugerenciasEfectivo(total: number): number[] {
  if (total <= 0) return [];
  const redondeos = [10_000, 20_000, 50_000, 100_000].map((b) => Math.ceil(total / b) * b).filter((v) => v > total);
  const distintos = [...new Set(redondeos)].sort((a, b) => a - b);
  return [total, ...distintos].slice(0, 3);
}

export type CodigoCobro = 'carritoVacio' | 'sinFormaPago' | 'fiadoSinCliente' | 'fiadoNoDivide' | 'sinSegundaForma';

/** Cobrar se deshabilita con carrito vacío, sin forma de pago, fiado sin cliente o pago dividido incompleto (spec 05, §2). */
export function validarCobro(d: { lineas: LineaCarrito[]; forma: string | null; fiado: boolean; cliente: string | null; dividido: boolean; segundaForma: string | null }): CodigoCobro | null {
  if (!d.lineas.length) return 'carritoVacio';
  if (!d.forma && !d.fiado) return 'sinFormaPago';
  if (d.fiado && !d.cliente) return 'fiadoSinCliente';
  if (d.fiado && d.dividido) return 'fiadoNoDivide';
  if (d.dividido && (!d.segundaForma || d.segundaForma === d.forma)) return 'sinSegundaForma';
  return null;
}

/** Número visible de la venta: POS-0001. */
export function numeroVenta(n: number): string {
  return `POS-${String(n).padStart(4, '0')}`;
}

export type VentaParaCosto = { fecha: Fecha; costoConocido: number; montoLibre: number; devuelta: boolean };

/**
 * B5 · Costo de lo vendido en el período: el costo real de lo vendido en el POS (costo × unidades guardado en la venta)
 * y, para las ventas registradas a mano y las líneas libres del POS, el % de costo del negocio.
 */
export function costoDeVentas(d: { ventasManuales: number; ventasPos: VentaParaCosto[]; costoPorcentaje: number; periodo: Periodo }): number {
  const pos = d.ventasPos.filter((v) => !v.devuelta && dentroDe(v.fecha, d.periodo));
  const real = pos.reduce((s, v) => s + v.costoConocido, 0);
  const libres = pos.reduce((s, v) => s + v.montoLibre, 0);
  return real + ((d.ventasManuales + libres) * d.costoPorcentaje) / 100;
}

/** Informe "Cierre del día" (spec 03, §5.9): ventas del POS de una fecha por forma de pago y por cuenta (sin las devueltas). */
export function cierreDelDia(ventas: { fecha: Fecha; estado: string; total: number; pagos: { nombre: string; cuenta: string | null; monto: number }[] }[], fecha: Fecha) {
  const delDia = ventas.filter((v) => v.fecha === fecha && v.estado !== 'devuelta');
  const porForma = new Map<string, number>();
  const porCuenta = new Map<string | null, number>();
  for (const v of delDia) {
    for (const p of v.pagos) {
      porForma.set(p.nombre, (porForma.get(p.nombre) ?? 0) + p.monto);
      porCuenta.set(p.cuenta, (porCuenta.get(p.cuenta) ?? 0) + p.monto);
    }
  }
  const ordenar = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  return { ventas: delDia.length, total: delDia.reduce((s, v) => s + v.total, 0), porForma: ordenar(porForma), porCuenta: ordenar(porCuenta) };
}
