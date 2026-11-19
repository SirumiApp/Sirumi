// Arenero del modo ejemplo: lo que la persona registra mientras ve el ejemplo (gastos, ventas, movimientos)
// vive solo en la memoria del celular, se suma a los datos inventados y se borra al salir del ejemplo.
// Sirve para probar y mostrar la app en vivo sin tocar datos reales.

import { useSyncExternalStore } from 'react';

import type { Fecha } from '@/lib/fechas';
import type { FilaStock } from '@/lib/inventario';
import type { MovNegocio } from '@/lib/negocio';
import type { Movimiento } from '@/lib/personal';
import type { devolucionParcial } from '@/lib/pos';
import type { LineaVenta, PagoVenta, Venta } from '@/pos/datos';

/** D4b en el ejemplo: lo que quedó de una venta después de devolver parte. */
type Parcial = { factor: number; subtotal: number; descuento: number; total: number; iva: number; pagos: number[]; devueltas: Record<number, number>; devuelto: number };

export type MovPersonalEjemplo = Movimiento & { recurrente?: string | null };
/** Lo editado se guarda como cambios parciales: los campos que no se tocaron (p. ej. la venta enlazada) se conservan. */
type Lista<T> = { nuevos: T[]; editados: Map<string, Partial<T>>; borrados: Set<string> };
const lista = <T>(): Lista<T> => ({ nuevos: [], editados: new Map(), borrados: new Set() });

let estado = { personal: lista<MovPersonalEjemplo>(), negocio: lista<MovNegocio>(), ventas: [] as Venta[], stock: [] as FilaStock[], numero: 0, devueltas: new Set<string>(), parciales: new Map<string, Parcial>() };
let version = 0;
let siguiente = 1;
const oyentes = new Set<() => void>();
const avisar = () => {
  version++;
  oyentes.forEach((o) => o());
};

/** Cambia cada vez que se registra algo en el ejemplo (para volver a pintar). */
export function useArenero(): number {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => version,
    () => version,
  );
}

export const idEjemplo = (prefijo: string) => `ej-${prefijo}-nuevo-${siguiente++}`;

/** Aplica lo registrado en el ejemplo a una lista: quita lo borrado, cambia lo editado y suma lo nuevo (primero). */
export function aplicar<T extends { id: string }>(base: T[], cambios: Lista<T>): T[] {
  const editar = (m: T): T => ({ ...m, ...(cambios.editados.get(m.id) ?? {}) });
  return [...cambios.nuevos, ...base].filter((m) => !cambios.borrados.has(m.id)).map(editar);
}

function guardar<T extends { id: string }>(l: Lista<T>, m: T, id?: string) {
  if (id) l.editados.set(id, { ...(l.editados.get(id) ?? {}), ...m, id });
  else l.nuevos.unshift(m);
  avisar();
}

export const personalEjemplo = (base: Movimiento[]) => aplicar(base, estado.personal);
/** Movimientos del negocio en el ejemplo (sin los de ventas devueltas: D4 quita la plata de la venta). */
export const negocioEjemplo = (base: MovNegocio[]) =>
  aplicar(base, estado.negocio)
    .filter((m) => !m.venta || !estado.devueltas.has(m.venta))
    .map((m) => {
      const p = m.venta ? estado.parciales.get(m.venta) : undefined;
      return p ? { ...m, monto: Math.round(m.monto * p.factor) } : m;
    });
export const ventasEjemplo = () => estado.ventas;
/** Marca como devueltas las ventas que se devolvieron en el ejemplo. */
export const conDevoluciones = (ventas: Venta[]) =>
  ventas.map((v) => {
    if (estado.devueltas.has(v.id)) return { ...v, estado: 'devuelta' as const };
    const p = estado.parciales.get(v.id);
    if (!p) return v;
    return {
      ...v,
      subtotal: p.subtotal,
      descuento: p.descuento,
      total: p.total,
      iva: p.iva,
      devuelto: p.devuelto,
      pagos: v.pagos.map((x, i) => ({ ...x, monto: p.pagos[i] ?? 0 })),
      lineas: v.lineas.map((l, i) => {
        const d = p.devueltas[i] ?? 0;
        return d ? { ...l, cantidad: l.cantidad - d, total: l.precio * (l.cantidad - d), devueltas: (l.devueltas ?? 0) + d } : l;
      }),
    };
  });

/** D4b en el ejemplo: devuelve unidades de algunas líneas (por su posición en la venta ya mostrada). */
export function devolverParteEnEjemplo(v: Venta, items: { indice: number; cantidad: number }[], calcular: typeof devolucionParcial) {
  const r = calcular({ subtotal: v.subtotal, descuento: v.descuento, total: v.total, iva: v.iva, pagos: v.pagos.map((p) => p.monto) }, items.map((x) => ({ precio: v.lineas[x.indice].precio, cantidad: x.cantidad })));
  if (r.completa) return devolverEnEjemplo(v);
  const previo = estado.parciales.get(v.id);
  const devueltas: Record<number, number> = { ...(previo?.devueltas ?? {}) };
  for (const x of items) devueltas[x.indice] = (devueltas[x.indice] ?? 0) + x.cantidad;
  const original = previo ? previo.total / previo.factor : v.total;
  estado.parciales.set(v.id, { factor: r.total / original, subtotal: r.subtotal, descuento: r.descuento, total: r.total, iva: r.iva, pagos: r.pagos, devueltas, devuelto: (previo?.devuelto ?? 0) + r.reembolso });
  if (v.bodega) for (const x of items) if (v.lineas[x.indice].variante) estado.stock.push({ variante: v.lineas[x.indice].variante as string, bodega: v.bodega, cantidad: -x.cantidad });
  avisar();
}

/** D4 en el ejemplo: la venta queda devuelta, su plata sale y el stock vuelve a la misma bodega. */
export function devolverEnEjemplo(v: Pick<Venta, 'id' | 'bodega' | 'lineas' | 'estado'>) {
  if (v.estado === 'devuelta' || estado.devueltas.has(v.id)) return;
  estado.devueltas.add(v.id);
  if (v.bodega) for (const l of v.lineas) if (l.variante) estado.stock.push({ variante: l.variante, bodega: v.bodega, cantidad: -l.cantidad });
  avisar();
}
/** Pagos de recurrentes personales registrados en el ejemplo. */
export const pagosRecurrentesEjemplo = () => estado.personal.nuevos.filter((m) => m.recurrente && !estado.personal.borrados.has(m.id)).map((m) => ({ fecha: m.fecha, recurrente: m.recurrente }));

export function guardarPersonalEnEjemplo(m: Omit<MovPersonalEjemplo, 'id'>, id?: string) {
  guardar(estado.personal, { ...m, id: id ?? idEjemplo('p') }, id);
}
export function borrarPersonalEnEjemplo(id: string) {
  estado.personal.borrados.add(id);
  avisar();
}
export function guardarNegocioEnEjemplo(m: Omit<MovNegocio, 'id'>, id?: string) {
  guardar(estado.negocio, { ...m, id: id ?? idEjemplo('n') }, id);
}
export function borrarNegocioEnEjemplo(id: string) {
  estado.negocio.borrados.add(id);
  avisar();
}

/** Stock del ejemplo después de las ventas hechas en él. */
export function stockEjemplo(base: FilaStock[]): FilaStock[] {
  return base.map((s) => {
    const resta = estado.stock.filter((d) => d.variante === s.variante && d.bodega === s.bodega).reduce((t, d) => t + d.cantidad, 0);
    return resta ? { ...s, cantidad: s.cantidad - resta } : s;
  });
}

export type CobroEjemplo = {
  fecha: Fecha;
  bodega: string | null;
  cliente: string | null;
  descuento: number;
  recibido: number | null;
  iva: { tarifa: number; incluido: boolean } | null;
  codigo: string | null;
  lineas: { variante: string | null; nombre: string; precio: number; cantidad: number; costo: number | null }[];
  pagos: PagoVenta[];
};

/**
 * D4 en el ejemplo (igual que cobrar_venta en el servidor): la venta, un movimiento por cada pago
 * (fiado = venta pendiente) y lo que sale del stock. Función pura.
 */
export function armarVentaEjemplo(d: CobroEjemplo, id: string, numero: number, creada: string) {
  const subtotal = d.lineas.reduce((t, l) => t + Math.round(l.precio) * l.cantidad, 0);
  let total = subtotal - Math.round(d.descuento);
  let iva = 0;
  if (d.iva && d.iva.tarifa > 0) {
    if (d.iva.incluido) iva = total - Math.round(total / (1 + d.iva.tarifa / 100));
    else {
      iva = Math.round((total * d.iva.tarifa) / 100);
      total += iva;
    }
  }
  const fiado = d.pagos.every((p) => !p.cuenta);
  const lineas: LineaVenta[] = d.lineas.map((l) => ({ variante: l.variante, nombre: l.nombre, precio: l.precio, costo: l.costo, cantidad: l.cantidad, total: Math.round(l.precio) * l.cantidad }));
  const venta: Venta = {
    id,
    numero,
    fecha: d.fecha,
    bodega: d.bodega,
    cliente: d.cliente,
    subtotal,
    descuento: Math.round(d.descuento),
    total,
    pagos: d.pagos,
    recibido: d.recibido,
    vuelto: d.recibido !== null ? Math.max(0, d.recibido - total) : null,
    iva,
    tarifaIva: d.iva ? d.iva.tarifa : null,
    ivaIncluido: d.iva ? d.iva.incluido : null,
    estado: fiado ? 'fiada' : 'pagada',
    creada,
    vendedor: null,
    codigo: d.codigo,
    lineas,
  };
  const movimientos: Omit<MovNegocio, 'id'>[] = d.pagos.map((p) => ({
    fecha: d.fecha,
    tipo: 'venta',
    monto: Math.round(p.monto),
    pagado: !!p.cuenta,
    cuenta: p.cuenta,
    tarjeta: null,
    concepto: `#${numero}`,
    contacto: d.cliente,
    venta: id,
  }));
  const stock: FilaStock[] = d.bodega ? d.lineas.filter((l) => l.variante).map((l) => ({ variante: l.variante as string, bodega: d.bodega as string, cantidad: l.cantidad })) : [];
  return { venta, movimientos, stock };
}

/** Cobra una venta en el ejemplo. `primerNumero` es el número siguiente a las ventas inventadas. */
export function cobrarEnEjemplo(d: CobroEjemplo, primerNumero: number) {
  const id = idEjemplo('venta');
  const numero = Math.max(primerNumero, estado.numero + 1);
  estado.numero = numero;
  const r = armarVentaEjemplo(d, id, numero, new Date().toISOString());
  estado.ventas = [r.venta, ...estado.ventas];
  estado.stock.push(...r.stock);
  for (const m of r.movimientos) estado.negocio.nuevos.unshift({ ...m, id: idEjemplo('n') });
  avisar();
  return { id, number: numero };
}

/** Al salir del ejemplo se borra todo lo que se registró en él. */
export function vaciarArenero() {
  estado = { personal: lista(), negocio: lista(), ventas: [], stock: [], numero: 0, devueltas: new Set(), parciales: new Map() };
  avisar();
}
