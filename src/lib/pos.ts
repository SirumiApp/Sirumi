// Sirumi POS (docs/reglas-de-calculo.md, sección D). Funciones puras: la venta real la guarda la base de datos
// en una sola transacción (función cobrar_venta).

import { dentroDe, type Fecha, type Periodo } from './fechas';

/** Una línea del carrito. `variante` null = venta libre (sin producto ni stock). */
export type LineaCarrito = {
  clave: string;
  variante: string | null;
  nombre: string;
  precio: number;
  cantidad: number;
  costo?: number | null;
  /** D6b · Tarifa de IVA del producto (0 = exento, 5…). Sin ella, la general del negocio. */
  tarifaIva?: number | null;
};
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
  if (!iva) return { subtotal, descuento: d, base: neto, iva: 0, total: neto, porTarifa: [] as [number, number][] };
  // D6b · El descuento se reparte entre las líneas; el IVA se calcula por cada tarifa (general, 5%, exento…).
  const netos = repartir(neto, lineas.map((l) => l.precio * l.cantidad));
  const grupos = new Map<number, number>();
  lineas.forEach((l, i) => {
    const tarifa = l.tarifaIva ?? iva.tarifa;
    grupos.set(tarifa, (grupos.get(tarifa) ?? 0) + netos[i]);
  });
  const porTarifa: [number, number][] = [...grupos.entries()]
    .filter(([tarifa]) => tarifa > 0)
    .map(([tarifa, monto]) => [tarifa, iva.incluido ? monto - Math.round(monto / (1 + tarifa / 100)) : Math.round((monto * tarifa) / 100)] as [number, number])
    .sort((a, b) => b[0] - a[0]);
  const impuesto = porTarifa.reduce((s, [, v]) => s + v, 0);
  if (iva.incluido) return { subtotal, descuento: d, base: neto - impuesto, iva: impuesto, total: neto, porTarifa };
  return { subtotal, descuento: d, base: neto, iva: impuesto, total: neto + impuesto, porTarifa };
}

/** D2 · ¿Cabe una unidad más de esta variante, según lo disponible en la bodega de venta? */
export function cabeEnCarrito(variante: string | null, disponible: number, carrito: LineaCarrito[]): boolean {
  if (!variante) return true;
  const enCarrito = carrito.filter((l) => l.variante === variante).reduce((s, l) => s + l.cantidad, 0);
  return enCarrito + 1 <= disponible;
}

/** D11 · Unidades de una variante apartadas en ventas en espera de una bodega (no se pueden vender dos veces). */
export function apartadasEnEspera(enEspera: { bodega: string | null; lineas: { variante: string | null; cantidad: number }[] }[], variante: string, bodega: string | null): number {
  return enEspera.filter((c) => c.bodega === bodega).reduce((s, c) => s + c.lineas.filter((l) => l.variante === variante).reduce((t, l) => t + l.cantidad, 0), 0);
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

/** Reparte `total` entre partes proporcionales a `pesos`, sin perder pesos por redondeo (la última se ajusta). */
export function repartir(total: number, pesos: number[]): number[] {
  const suma = pesos.reduce((s, p) => s + p, 0);
  if (suma <= 0) return pesos.map((_, i) => (i === pesos.length - 1 ? total : 0));
  const partes = pesos.map((p) => Math.round((total * p) / suma));
  partes[partes.length - 1] += total - partes.reduce((s, p) => s + p, 0);
  return partes;
}

/**
 * D4b · Devolver parte de una venta: se devuelve lo que pagó el cliente por esas unidades,
 * con el mismo descuento e IVA de la venta (reembolso = valor de las unidades × total / subtotal).
 * La venta queda con su nuevo subtotal, descuento, IVA y total, y cada pago baja en proporción.
 */
export function devolucionParcial(v: { subtotal: number; descuento: number; total: number; iva: number; pagos: number[] }, devueltas: { precio: number; cantidad: number }[]) {
  const valor = devueltas.reduce((s, l) => s + Math.round(l.precio) * l.cantidad, 0);
  const subtotal = Math.max(0, v.subtotal - valor);
  if (subtotal === 0) return { reembolso: v.total, subtotal: 0, descuento: 0, total: 0, iva: 0, pagos: v.pagos.map(() => 0), completa: true };
  const total = Math.round((v.total * subtotal) / v.subtotal);
  return {
    reembolso: v.total - total,
    subtotal,
    descuento: Math.round((v.descuento * subtotal) / v.subtotal),
    total,
    iva: Math.round((v.iva * total) / Math.max(1, v.total)),
    pagos: repartir(total, v.pagos),
    completa: false,
  };
}
