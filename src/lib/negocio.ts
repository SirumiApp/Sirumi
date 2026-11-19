// Reglas de plata del negocio (docs/reglas-de-calculo.md, sección B). Funciones puras, sin redondeos intermedios.

import { dentroDe, type Fecha, type Periodo } from './fechas';

export type TipoNegocio = 'venta' | 'compra' | 'fijo' | 'variable' | 'inversion' | 'aporte' | 'prestamo' | 'retiro' | 'impuesto';

/** B1 · Cómo cuenta cada tipo: si entra o sale, dónde va en el estado de resultados y si puede quedar pendiente. */
export const TIPOS_NEGOCIO: Record<TipoNegocio, { entra: boolean; resultados: 'ventas' | 'fijo' | 'variable' | 'impuestos' | 'no'; puedePendiente: boolean }> = {
  venta: { entra: true, resultados: 'ventas', puedePendiente: true },
  compra: { entra: false, resultados: 'no', puedePendiente: true }, // va al inventario; es costo cuando se vende
  fijo: { entra: false, resultados: 'fijo', puedePendiente: true },
  variable: { entra: false, resultados: 'variable', puedePendiente: true },
  inversion: { entra: false, resultados: 'no', puedePendiente: true }, // es un activo
  aporte: { entra: true, resultados: 'no', puedePendiente: false },
  prestamo: { entra: true, resultados: 'no', puedePendiente: false },
  retiro: { entra: false, resultados: 'no', puedePendiente: false }, // no es gasto del negocio
  impuesto: { entra: false, resultados: 'impuestos', puedePendiente: false },
};

export const ORDEN_TIPOS: TipoNegocio[] = ['venta', 'compra', 'fijo', 'variable', 'inversion', 'aporte', 'prestamo', 'retiro', 'impuesto'];

export type MovNegocio = {
  id: string;
  fecha: Fecha;
  tipo: TipoNegocio;
  monto: number;
  pagado: boolean;
  /** Cuenta de donde sale o a donde entra (si está pagado y no fue con tarjeta). */
  cuenta: string | null;
  /** Tarjeta de crédito con la que se pagó (solo salidas). */
  tarjeta: string | null;
  concepto?: string | null;
  /** Cliente o proveedor (B11), opcional. */
  contacto?: string | null;
  /** Pago recurrente desde el que se registró (B10), si aplica. */
  recurrente?: string | null;
  /** Venta del POS de la que salió (D4), si aplica. */
  venta?: string | null;
};

/** Plata movida entre cuentas propias, o pago de una tarjeta desde una cuenta. */
export type Transferencia = { id?: string; fecha: Fecha; desde: string; haciaCuenta: string | null; haciaTarjeta: string | null; monto: number; nota?: string | null };
export type CuentaNegocio = { id: string; saldoInicial: number };
export type TarjetaCredito = { id: string; cupo: number; deudaInicial: number };

const suma = <T,>(lista: T[], valor: (x: T) => number) => lista.reduce((s, x) => s + valor(x), 0);

/** B2 · Saldo = inicial + entradas pagadas − salidas pagadas (sin tarjeta) + traslados recibidos − traslados enviados. */
export function saldoCuenta(cuenta: CuentaNegocio, movs: MovNegocio[], traslados: Transferencia[]): number {
  const deLaCuenta = movs.filter((m) => m.pagado && m.cuenta === cuenta.id && !m.tarjeta);
  return (
    cuenta.saldoInicial +
    suma(deLaCuenta.filter((m) => TIPOS_NEGOCIO[m.tipo].entra), (m) => m.monto) -
    suma(deLaCuenta.filter((m) => !TIPOS_NEGOCIO[m.tipo].entra), (m) => m.monto) +
    suma(traslados.filter((t) => t.haciaCuenta === cuenta.id), (t) => t.monto) -
    suma(traslados.filter((t) => t.desde === cuenta.id), (t) => t.monto)
  );
}

/** B4 · Caja total = suma de los saldos de todas las cuentas. */
export function cajaTotal(cuentas: CuentaNegocio[], movs: MovNegocio[], traslados: Transferencia[]): number {
  return suma(cuentas, (c) => saldoCuenta(c, movs, traslados));
}

/** B3 · Deuda = inicial + compras pagadas con la tarjeta − pagos hechos a la tarjeta. */
export function deudaTarjeta(tarjeta: TarjetaCredito, movs: MovNegocio[], traslados: Transferencia[]): number {
  return (
    tarjeta.deudaInicial +
    suma(movs.filter((m) => m.pagado && m.tarjeta === tarjeta.id && !TIPOS_NEGOCIO[m.tipo].entra), (m) => m.monto) -
    suma(traslados.filter((t) => t.haciaTarjeta === tarjeta.id), (t) => t.monto)
  );
}

export const UMBRAL_TARJETA = 80;

/** B3 · Cupo disponible y aviso: "alta" desde el 80% del cupo, "excedida" si la deuda supera el cupo. */
export function estadoTarjeta(tarjeta: TarjetaCredito, movs: MovNegocio[], traslados: Transferencia[]) {
  const deuda = deudaTarjeta(tarjeta, movs, traslados);
  const uso = tarjeta.cupo > 0 ? Math.round((deuda / tarjeta.cupo) * 100) : 0;
  const alerta: 'ok' | 'alta' | 'excedida' = deuda > tarjeta.cupo ? 'excedida' : uso > UMBRAL_TARJETA ? 'alta' : 'ok';
  return { deuda, disponible: tarjeta.cupo - deuda, uso, alerta };
}

/** B3 · Una venta (o cualquier entrada) nunca va a una tarjeta: si eligen una, se guarda en la cuenta principal. */
export function cuentaDeEntrada(destino: { cuenta: string | null; tarjeta: string | null }, cuentaPrincipal: string) {
  return { cuenta: destino.cuenta ?? cuentaPrincipal, tarjeta: null };
}

export type EstadoDeResultados = {
  ventas: number;
  costoVentas: number;
  utilidadBruta: number;
  margenBruto: number;
  fijos: number;
  variables: number;
  operativa: number;
  impuestos: number;
  neta: number;
};

/**
 * B5 · Estado de resultados del período (los movimientos ya vienen filtrados por fechas).
 * Ventas cobradas o no; costo real de lo vendido si se conoce, si no el % de costo del negocio.
 * Las compras con tarjeta sí son gasto; compras de producto, inversión, aportes, préstamos y retiros no.
 */
export function estadoDeResultados(
  movs: MovNegocio[],
  opciones: { costoPorcentaje: number; costoReal?: number; impuestos?: number; /** D6 · IVA cobrado en el POS: las ventas cuentan sin él. */ ivaVentas?: number },
): EstadoDeResultados {
  const deTipo = (r: (typeof TIPOS_NEGOCIO)[TipoNegocio]['resultados']) => suma(movs.filter((m) => TIPOS_NEGOCIO[m.tipo].resultados === r), (m) => m.monto);
  const ventas = deTipo('ventas') - (opciones.ivaVentas ?? 0);
  const costoVentas = opciones.costoReal ?? (ventas * opciones.costoPorcentaje) / 100;
  const utilidadBruta = ventas - costoVentas;
  const fijos = deTipo('fijo');
  const variables = deTipo('variable');
  const operativa = utilidadBruta - fijos - variables;
  const impuestos = opciones.impuestos ?? 0;
  return {
    ventas,
    costoVentas,
    utilidadBruta,
    margenBruto: ventas > 0 ? utilidadBruta / ventas : 0,
    fijos,
    variables,
    operativa,
    impuestos,
    neta: operativa - impuestos,
  };
}

/** B5 · "De cada $100 que vendes": cada parte como % de las ventas (1 decimal). */
export function deCada100(r: EstadoDeResultados) {
  const pct = (v: number) => (r.ventas > 0 ? Math.round((v / r.ventas) * 1000) / 10 : 0);
  return { costo: pct(r.costoVentas), fijos: pct(r.fijos), variables: pct(r.variables), impuestos: pct(r.impuestos), queda: pct(r.neta) };
}

/** B6 · Flujo de caja: solo lo cobrado o pagado en el período, sin las compras con tarjeta. */
export function flujoDeCaja(movs: MovNegocio[], traslados: Transferencia[], periodo: Periodo, cajaInicio: number) {
  const pagados = movs.filter((m) => m.pagado && !m.tarjeta && dentroDe(m.fecha, periodo));
  const de = (...tipos: TipoNegocio[]) => suma(pagados.filter((m) => tipos.includes(m.tipo)), (m) => m.monto);
  const pagosTarjetas = suma(traslados.filter((t) => t.haciaTarjeta && dentroDe(t.fecha, periodo)), (t) => t.monto);
  const operacion = de('venta') - de('compra') - de('fijo') - de('variable') - de('impuesto');
  const inversion = -de('inversion');
  const financiacion = de('aporte') + de('prestamo') - de('retiro') - pagosTarjetas;
  return { operacion, inversion, financiacion, cierre: cajaInicio + operacion + inversion + financiacion };
}

/** B8 · Margen de contribución y ventas de equilibrio del mes. Sin margen positivo no hay equilibrio (null). */
export function puntoDeEquilibrio(d: { fijosMes: number; costoPorcentaje: number; variables: number; ventas: number }) {
  const margen = d.ventas > 0 ? 1 - d.costoPorcentaje / 100 - d.variables / d.ventas : 1 - d.costoPorcentaje / 100;
  return { margen, ventasEquilibrio: margen > 0 ? d.fijosMes / margen : null };
}

/** B8 · Unidades de equilibrio de un producto = techo(equilibrio / precio). */
export function unidadesDeEquilibrio(ventasEquilibrio: number, precio: number): number {
  return precio > 0 ? Math.ceil(ventasEquilibrio / precio) : 0;
}

/** B8b · Lo que te deben, lo que debes y cómo quedaría la caja si todo se cobra y se paga. */
export function porCobrarYPagar(movs: MovNegocio[], arranque: { deudasIniciales: number; porCobrarInicial?: number }, caja: number) {
  const pendientes = movs.filter((m) => !m.pagado);
  const porCobrar = suma(pendientes.filter((m) => m.tipo === 'venta'), (m) => m.monto) + (arranque.porCobrarInicial ?? 0);
  const porPagar = suma(pendientes.filter((m) => m.tipo !== 'venta'), (m) => m.monto) + arranque.deudasIniciales;
  return { porCobrar, porPagar, proyeccion: caja + porCobrar - porPagar };
}

export type EstadoSalud = 'saludable' | 'atencion' | 'riesgo';

/** B8c · Salud del negocio de 0 a 100 (la fórmula del prototipo). */
export function saludDelNegocio(d: {
  neta: number;
  operativa: number;
  caja: number;
  gastosMes: number;
  ventas: number;
  equilibrio: number | null;
  porCobrar: number;
  retiros: number;
}): { puntaje: number; estado: EstadoSalud } {
  const mesesCaja = d.gastosMes > 0 ? d.caja / d.gastosMes : 0;
  let puntaje = 0;
  puntaje += d.neta > 0 ? 30 : d.operativa > 0 ? 12 : 0;
  puntaje += mesesCaja >= 3 ? 25 : mesesCaja >= 1 ? 12 : 0;
  puntaje += d.equilibrio && d.equilibrio > 0 ? Math.min(20, Math.round((d.ventas / d.equilibrio) * 20)) : 0;
  puntaje += d.ventas > 0 && d.porCobrar / d.ventas > 0.25 ? 4 : 10;
  puntaje += d.retiros <= Math.max(0, d.operativa) ? 15 : 0;
  puntaje = Math.min(100, puntaje);
  return { puntaje, estado: puntaje >= 75 ? 'saludable' : puntaje >= 50 ? 'atencion' : 'riesgo' };
}

const BILLETERAS = ['nequi', 'daviplata', 'movii', 'dale', 'lulo', 'nu', 'rappi', 'uala', 'mercado pago', 'bold'];

/** B8d · Ícono de la cuenta según su nombre. */
export function iconoDeCuenta(nombre: string): 'billetera' | 'efectivo' | 'banco' {
  const n = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (/\befectivo\b/.test(n)) return 'efectivo';
  if (BILLETERAS.some((b) => new RegExp(`\\b${b}\\b`).test(n))) return 'billetera';
  return 'banco';
}

/** Arranque (spec 03, §1): lo que el negocio tiene, lo que debe y su patrimonio al empezar. */
export function resumenArranque(d: {
  cuentas: number[];
  porCobrar: number;
  inventario: number;
  equipos: number;
  deudaProveedores: number;
  prestamos: number;
  tarjetas: { cupo: number; deuda: number }[];
}) {
  const tienes = d.cuentas.reduce((s, v) => s + v, 0) + d.porCobrar + d.inventario + d.equipos;
  const debes = d.deudaProveedores + d.prestamos + d.tarjetas.reduce((s, t) => s + t.deuda, 0);
  return { tienes, debes, patrimonio: tienes - debes };
}

/** Mover plata o pagar una tarjeta (spec 03, §4): devuelve un código de error o null si está bien. */
export function validarTraslado(d: { desde: string | null; haciaCuenta: string | null; haciaTarjeta: string | null; monto: number }) {
  if (!d.monto || d.monto <= 0) return 'trasladoSinMonto' as const;
  if (!d.desde || (!d.haciaCuenta && !d.haciaTarjeta)) return 'trasladoSinCuentas' as const;
  if (d.haciaCuenta && d.haciaCuenta === d.desde) return 'trasladoMismaCuenta' as const;
  return null;
}
