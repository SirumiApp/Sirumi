// Informes del negocio (docs/specs/03-negocio.md §5): flujo de caja, cartera, dueño y capital, balance.
// Funciones puras; usan las reglas de la sección B (negocio.ts).

import { dentroDe, diasEntre, type Fecha, type Periodo } from './fechas';
import { cajaTotal, deudaTarjeta, flujoDeCaja, TIPOS_NEGOCIO, type CuentaNegocio, type MovNegocio, type TarjetaCredito, type Transferencia } from './negocio';

const suma = <T,>(lista: T[], valor: (x: T) => number) => lista.reduce((s, x) => s + valor(x), 0);

/** Caja al empezar un día: todo lo pagado y trasladado antes de esa fecha (B4). */
export function cajaAntesDe(fecha: Fecha, cuentas: CuentaNegocio[], movs: MovNegocio[], traslados: Transferencia[]): number {
  return cajaTotal(
    cuentas,
    movs.filter((m) => m.fecha < fecha),
    traslados.filter((t) => t.fecha < fecha),
  );
}

/** B6 · Flujo de caja del período con la caja al inicio calculada (el cierre coincide con B4 si el período termina hoy). */
export function flujoDelPeriodo(periodo: Periodo, cuentas: CuentaNegocio[], movs: MovNegocio[], traslados: Transferencia[]) {
  const inicio = cajaAntesDe(periodo.desde, cuentas, movs, traslados);
  return { inicio, ...flujoDeCaja(movs, traslados, periodo, inicio) };
}

/** Entradas y salidas del período por tipo (B1), cobradas o no. */
export function entradasYSalidas(movs: MovNegocio[], periodo: Periodo) {
  const del = movs.filter((m) => dentroDe(m.fecha, periodo));
  const porTipo = new Map<MovNegocio['tipo'], number>();
  for (const m of del) porTipo.set(m.tipo, (porTipo.get(m.tipo) ?? 0) + m.monto);
  const filas = [...porTipo.entries()].map(([tipo, monto]) => ({ tipo, monto, entra: TIPOS_NEGOCIO[tipo].entra })).sort((a, b) => b.monto - a.monto);
  return {
    entradas: suma(filas.filter((f) => f.entra), (f) => f.monto),
    salidas: suma(filas.filter((f) => !f.entra), (f) => f.monto),
    filas,
  };
}

export type Antiguedad = 'al30' | 'al60' | 'al90' | 'mas90';
const TRAMOS: Antiguedad[] = ['al30', 'al60', 'al90', 'mas90'];

function tramo(dias: number): Antiguedad {
  return dias <= 30 ? 'al30' : dias <= 60 ? 'al60' : dias <= 90 ? 'al90' : 'mas90';
}

/**
 * Cartera: lo pendiente por cobrar (ventas) y por pagar (lo demás), por antigüedad en días desde la fecha del movimiento.
 * Los saldos del arranque (lo que te debían, deudas con proveedores y préstamos) van aparte, sin antigüedad.
 */
export function cartera(movs: MovNegocio[], hoy: Fecha) {
  const pendientes = movs.filter((m) => !m.pagado);
  const agrupar = (lista: MovNegocio[]) => {
    const tramos = Object.fromEntries(TRAMOS.map((t) => [t, 0])) as Record<Antiguedad, number>;
    for (const m of lista) tramos[tramo(Math.max(0, diasEntre(m.fecha, hoy)))] += m.monto;
    return { total: suma(lista, (m) => m.monto), tramos, lista: [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha)) };
  };
  return { porCobrar: agrupar(pendientes.filter((m) => m.tipo === 'venta')), porPagar: agrupar(pendientes.filter((m) => m.tipo !== 'venta')) };
}

/** Dueño y capital del período: lo que pusiste, lo que sacaste y lo que ganó el negocio. */
export function duenoYCapital(movs: MovNegocio[], periodo: Periodo, neta: number) {
  const del = movs.filter((m) => dentroDe(m.fecha, periodo));
  const de = (tipo: MovNegocio['tipo']) => suma(del.filter((m) => m.tipo === tipo), (m) => m.monto);
  const aportes = de('aporte');
  const retiros = de('retiro');
  return { aportes, retiros, neta, prestamos: de('prestamo'), queda: aportes + neta - retiros };
}

/**
 * Balance a hoy (spec §5.11). Lo que tienes: caja, lo que te deben, inventario y equipos.
 * Lo que debes: lo pendiente por pagar (incluye proveedores y préstamos del arranque) y cada tarjeta.
 */
export function balance(d: {
  cuentas: CuentaNegocio[];
  tarjetas: TarjetaCredito[];
  movs: MovNegocio[];
  traslados: Transferencia[];
  porCobrar: number;
  porPagar: number;
  equipos: number;
  inventario: number;
}) {
  const caja = cajaTotal(d.cuentas, d.movs, d.traslados);
  const tarjetas = d.tarjetas.map((t) => ({ id: t.id, deuda: deudaTarjeta(t, d.movs, d.traslados) }));
  const tienes = caja + d.porCobrar + d.inventario + d.equipos;
  const debes = d.porPagar + suma(tarjetas, (t) => Math.max(0, t.deuda));
  return { caja, tarjetas, tienes, debes, patrimonio: tienes - debes };
}

/** B7 · Cuánto apartar para impuestos de cada $100.000 que vendes. */
export function apartarDeCada(impuesto: number, ventas: number, base = 100_000): number {
  return ventas > 0 ? Math.round((Math.max(0, impuesto) / ventas) * base) : 0;
}
