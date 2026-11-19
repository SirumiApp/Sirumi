import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSesion } from '@/auth/sesion';
import type { Json } from '@/lib/database.types';
import type { Fecha } from '@/lib/fechas';
import type { Recurrente } from '@/lib/contactos';
import { iconoDeCuenta, type MovNegocio, type TipoNegocio, type Transferencia } from '@/lib/negocio';
import { BODEGAS_EJEMPLO, CONTACTOS_EJEMPLO, CUENTAS_EJEMPLO, esTextoEjemplo, PRODUCTOS_EJEMPLO, RECURRENTES_EJEMPLO, STOCK_EJEMPLO, ventasPosEjemplo, movimientosNegocioEjemplo, NEGOCIO_EJEMPLO, TARJETAS_EJEMPLO, trasladosEjemplo } from '@/ejemplo/datosEjemplo';
import { borrarNegocioEnEjemplo, conDevoluciones, guardarNegocioEnEjemplo, negocioEjemplo, stockEjemplo, useArenero, ventasEjemplo } from '@/ejemplo/arenero';
import { modoEjemploActivo, sinGuardar, useModoEjemplo } from '@/ejemplo/modo';
import { hoyEn } from '@/lib/fechas';
import { nombreVariante } from '@/lib/inventario';
import { todasLasFilas } from '@/lib/paginas';
import { supabase } from '@/lib/supabase';

import { cargarPos, type CodigoDescuento, type FormaPagoPropia, type Venta } from '@/pos/datos';

import { cargarInventario, type DatosInventario } from './inventarioDatos';

export type Regimen = 'simple' | 'ordinario' | 'natural';

/** Operación normal y lo que el negocio tenía al arrancar (businesses.setup). Todo opcional. */
export type Configuracion = {
  ventas_mes?: number;
  fijos_mes?: number;
  costo_porcentaje?: number;
  grupo_actividad?: 1 | 2 | 3 | 4;
  por_cobrar_inicial?: number;
  equipos?: number;
  deuda_proveedores?: number;
  prestamos?: number;
  /** ¿Es responsable de IVA? Entonces el POS calcula el IVA (D6). */
  responsable_iva?: boolean;
  /** ICA del municipio, por mil de las ventas (si no, el de la tabla del año). */
  ica_por_mil?: number;
  arranque_listo?: boolean;
  /** B12 · Último dígito del NIT (sin el de verificación), para las fechas de la DIAN. */
  digito_nit?: number;
  /** B12 · ¿Practica retención en la fuente? (declara cada mes). */
  agente_retencion?: boolean;
  /** B12 · IVA bimestral (ventas altas) o cuatrimestral. */
  periodo_iva?: 'bimestral' | 'cuatrimestral';
  /** B13 · Tarifa propia del impuesto a las ventas (si no, la del país). */
  tasa_ventas?: number;
  /** B13 · Fuera de Colombia: % de impuesto sobre la utilidad (lo dice el contador). */
  tasa_utilidad?: number;
};

export type Negocio = {
  id: string;
  nombre: string;
  regimen: Regimen | null;
  configuracion: Configuracion;
  /** Dueño o vendedor (el vendedor solo ve el POS y sus ventas). */
  rol: 'owner' | 'seller';
  /** Bodega desde donde vende un vendedor (si el dueño le asignó una). */
  bodegaAsignada: string | null;
};
export type Cuenta = { id: string; nombre: string; tipo: 'banco' | 'billetera' | 'efectivo'; saldoInicial: number; principal: boolean };
export type Tarjeta = { id: string; nombre: string; cupo: number; deudaInicial: number };
export type TipoDocumento = 'cedula' | 'nit' | 'ce' | 'pasaporte';
/** Cliente o proveedor (B11). Es del negocio: nunca se usa para mercadeo de Sirumi. */
export type Contacto = {
  id: string;
  tipo: 'cliente' | 'proveedor';
  nombre: string;
  tipoDocumento: TipoDocumento | null;
  documento: string;
  celular: string;
  correo: string;
  direccion: string;
  ciudad: string;
  notas: string;
};

export type DatosNegocio = DatosInventario & {
  negocio: Negocio | null;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  movimientos: MovNegocio[];
  traslados: Transferencia[];
  contactos: Contacto[];
  recurrentes: Recurrente[];
  ventas: Venta[];
  formasPago: FormaPagoPropia[];
  codigos: CodigoDescuento[];
  cargando: boolean;
};

const VACIO: DatosNegocio = { negocio: null, cuentas: [], tarjetas: [], movimientos: [], traslados: [], contactos: [], recurrentes: [], bodegas: [], productos: [], stock: [], ventas: [], formasPago: [], codigos: [], cargando: true };

type FilaContacto = { id: string; kind: string; name: string; doc_type: string | null; doc_number: string | null; phone: string | null; email: string | null; address: string | null; city: string | null; notes: string | null };
const aContacto = (c: FilaContacto): Contacto => ({
  id: c.id,
  tipo: c.kind as Contacto['tipo'],
  nombre: c.name,
  tipoDocumento: (c.doc_type as TipoDocumento | null) ?? null,
  documento: c.doc_number ?? '',
  celular: c.phone ?? '',
  correo: c.email ?? '',
  direccion: c.address ?? '',
  ciudad: c.city ?? '',
  notas: c.notes ?? '',
});

/** El negocio de la persona (el primero donde es dueña) con todo lo necesario para las reglas B. */
export function useDatosNegocio(version = 0): DatosNegocio & { recargar: () => void } {
  const { sesion } = useSesion();
  const idUsuario = sesion?.user.id;
  const [datos, setDatos] = useState<DatosNegocio>(VACIO);

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    // Primero el negocio donde es dueño ('owner' va antes que 'seller'); si no, donde vende.
    const { data: miembro } = await supabase
      .from('business_members')
      .select('business_id, role, warehouse_id, businesses(id, name)')
      .eq('user_id', idUsuario)
      .order('role')
      .order('created_at')
      .limit(1)
      .maybeSingle();
    const b = miembro?.businesses as { id: string; name: string } | null | undefined;
    if (!miembro || !b) return setDatos({ ...VACIO, cargando: false });
    const rol = miembro.role === 'seller' ? 'seller' : 'owner';
    // La configuración (ventas, gastos, régimen) solo la ve completa el dueño.
    const { data: conf } = await supabase.rpc('configuracion_de_negocio', { negocio: b.id });
    const config = (conf ?? {}) as { setup?: Json; tax_regime?: string | null };
    const negocio: Negocio = {
      id: b.id,
      nombre: b.name,
      regimen: (config.tax_regime as Regimen | null) ?? null,
      configuracion: (config.setup ?? {}) as Configuracion,
      rol,
      bodegaAsignada: miembro.warehouse_id,
    };

    if (rol === 'seller') {
      // El vendedor: productos, stock, clientes, formas de pago, cuentas para cobrar (sin saldos) y sus ventas.
      const [cuentas, contactos, inventario, pos] = await Promise.all([
        supabase.rpc('cuentas_para_vender', { negocio: b.id }),
        supabase.from('contacts').select('id, kind, name, doc_type, doc_number, phone, email, address, city, notes').eq('business_id', b.id).eq('kind', 'cliente').order('name'),
        cargarInventario(b.id),
        cargarPos(b.id),
      ]);
      return setDatos({
        ...VACIO,
        negocio,
        cuentas: (cuentas.data ?? []).map((c) => ({ id: c.id, nombre: c.name, tipo: c.kind as Cuenta['tipo'], saldoInicial: 0, principal: c.is_main })),
        contactos: (contactos.data ?? []).map(aContacto),
        ...inventario,
        ...pos,
        cargando: false,
      });
    }

    const [cuentas, tarjetas, movimientos, traslados, contactos, recurrentes, inventario, pos] = await Promise.all([
      supabase.from('accounts').select('id, name, kind, initial_balance, is_main').eq('business_id', b.id).order('created_at'),
      supabase.from('credit_cards').select('id, name, credit_limit, initial_debt').eq('business_id', b.id).order('created_at'),
      // Todo (por páginas): los saldos de las cuentas dependen de todos los movimientos.
      todasLasFilas((desde, hasta) =>
        supabase
          .from('movements')
          .select('id, date, kind, amount, paid, account_id, card_id, description, contact_id, recurring_id, sale_id')
          .eq('business_id', b.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id')
          .range(desde, hasta),
      ),
      todasLasFilas((desde, hasta) =>
        supabase
          .from('transfers')
          .select('id, date, from_account, to_account, to_card, amount, note')
          .eq('business_id', b.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id')
          .range(desde, hasta),
      ),
      todasLasFilas((desde, hasta) =>
        supabase.from('contacts').select('id, kind, name, doc_type, doc_number, phone, email, address, city, notes').eq('business_id', b.id).order('name').order('id').range(desde, hasta),
      ),
      supabase.from('recurring_payments').select('id, name, kind, amount, day_of_month, account_id, active').eq('business_id', b.id).order('day_of_month'),
      cargarInventario(b.id),
      cargarPos(b.id),
    ]);

    setDatos({
      negocio,
      cuentas: (cuentas.data ?? []).map((c) => ({
        id: c.id,
        nombre: c.name,
        tipo: c.kind as Cuenta['tipo'],
        saldoInicial: c.initial_balance,
        principal: c.is_main,
      })),
      tarjetas: (tarjetas.data ?? []).map((t) => ({ id: t.id, nombre: t.name, cupo: t.credit_limit, deudaInicial: t.initial_debt })),
      movimientos: (movimientos.data ?? []).map((m) => ({
        id: m.id,
        fecha: m.date,
        tipo: m.kind as TipoNegocio,
        monto: m.amount,
        pagado: m.paid,
        cuenta: m.account_id,
        tarjeta: m.card_id,
        concepto: m.description,
        contacto: m.contact_id,
        recurrente: m.recurring_id,
        venta: m.sale_id,
      })),
      traslados: (traslados.data ?? []).map((t) => ({ id: t.id, fecha: t.date, desde: t.from_account, haciaCuenta: t.to_account, haciaTarjeta: t.to_card, monto: t.amount, nota: t.note })),
      contactos: (contactos.data ?? []).map(aContacto),
      recurrentes: (recurrentes.data ?? []).map((r) => ({
        id: r.id,
        nombre: r.name,
        tipo: r.kind as Recurrente['tipo'],
        monto: r.amount,
        dia: r.day_of_month,
        cuenta: r.account_id,
        activo: r.active,
      })),
      ...inventario,
      ...pos,
      cargando: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` solo sirve para forzar una nueva lectura
  }, [idUsuario, version]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor
    cargar();
  }, [cargar]);

  const ejemplo = useModoEjemplo();
  const arenero = useArenero();
  const { t } = useTranslation();
  const deEjemplo = useMemo<DatosNegocio | null>(() => {
    if (!ejemplo) return null;
    const hoy = hoyEn();
    const pos = ventasPosEjemplo(hoy, movimientosNegocioEjemplo(hoy));
    const tx = (s: string | null | undefined) => (esTextoEjemplo(s) ? (t(s as never) as string) : (s ?? null));
    return {
      negocio: { ...NEGOCIO_EJEMPLO, nombre: tx(NEGOCIO_EJEMPLO.nombre) ?? '', rol: 'owner', bodegaAsignada: null },
      cuentas: CUENTAS_EJEMPLO.map((c) => ({ ...c, nombre: tx(c.nombre) ?? '' })),
      tarjetas: TARJETAS_EJEMPLO,
      // Lo inventado más lo que la persona registró en el ejemplo (arenero).
      movimientos: negocioEjemplo(pos.movimientos.map((m) => ({ ...m, concepto: tx(m.concepto) }))).sort((a, b) => b.fecha.localeCompare(a.fecha)),
      traslados: trasladosEjemplo(hoy).map((tr) => ({ ...tr, nota: tx(tr.nota) })),
      contactos: CONTACTOS_EJEMPLO.map((c) => ({ ...c, notas: tx(c.notas) ?? '' })),
      recurrentes: RECURRENTES_EJEMPLO.map((r) => ({ ...r, nombre: tx(r.nombre) ?? '' })),
      bodegas: BODEGAS_EJEMPLO.map((b) => ({ ...b, nombre: tx(b.nombre) ?? '' })),
      productos: PRODUCTOS_EJEMPLO.map((p) => ({
        ...p,
        nombre: tx(p.nombre) ?? '',
        coleccion: tx(p.coleccion),
        variantes: p.variantes.map((v) => ({ ...v, color: tx(v.color), nombre: nombreVariante({ color: tx(v.color), talla: v.talla }) })),
      })),
      stock: stockEjemplo(STOCK_EJEMPLO),
      codigos: [{ id: 'ej-cod-1', codigo: 'FERIA10', tipo: 'porcentaje', valor: 10, activo: true, vence: null }],
      ventas: conDevoluciones([
        ...ventasEjemplo(),
        ...pos.ventas.map((v) => ({
        ...v,
        pagos: v.pagos.map((p) => ({ ...p, nombre: tx(p.nombre) ?? '' })),
        lineas: v.lineas.map((l) => ({ ...l, nombre: l.nombre.includes('|') ? `${tx(l.nombre.split('|')[0])} · ${l.nombre.split('|')[1]}` : (tx(l.nombre) ?? '') })),
        })),
      ]),
      formasPago: [],
      cargando: false,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `arenero` cambia cuando se registra algo en el ejemplo
  }, [ejemplo, t, arenero]);
  return { ...(deEjemplo ?? datos), recargar: cargar };
}

/** Para quien eligió solo finanzas personales: crea su negocio con Efectivo y Bodega principal. */
export async function crearMiNegocio(nombre: string, nombres: { efectivo: string; bodega: string }) {
  if (modoEjemploActivo()) return sinGuardar();
  const { data, error } = await supabase.rpc('crear_negocio', { nombre });
  if (error || !data) return { error: error ?? new Error('sin negocio') };
  const id = (data as { id: string }).id;
  const [c, w] = await Promise.all([
    supabase.from('accounts').insert({ owner_type: 'negocio', business_id: id, name: nombres.efectivo, kind: 'efectivo', is_main: true }),
    supabase.from('warehouses').insert({ business_id: id, name: nombres.bodega, is_main: true }),
  ]);
  return { error: c.error ?? w.error };
}

export type DatosArranque = {
  nombre: string;
  regimen: Regimen | null;
  configuracion: Configuracion;
  /** Cuentas que quedan (sin id = nuevas). Efectivo viene con su id. */
  cuentas: { id?: string; nombre: string; saldo: number }[];
  cuentasQuitadas: string[];
  tarjetas: { id?: string; nombre: string; cupo: number; deuda: number }[];
  tarjetasQuitadas: string[];
};

/** La configuración del negocio como está ahora en el servidor (o la que hay en la app, si no hay conexión). */
async function configuracionActual(negocio: Negocio): Promise<Configuracion> {
  const { data } = await supabase.rpc('configuracion_de_negocio', { negocio: negocio.id });
  return ((data as { setup?: Configuracion } | null)?.setup ?? negocio.configuracion) as Configuracion;
}

/** Guarda el arranque. Devuelve cuántos movimientos pasaron a la cuenta principal por quitar cuentas. */
export async function guardarArranque(negocio: Negocio, d: DatosArranque): Promise<{ error: unknown; movidos: number; errorTarjeta: boolean }> {
  if (modoEjemploActivo()) return sinGuardar({ movidos: 0, errorTarjeta: false });
  const r1 = await supabase
    .from('businesses')
    .update({ name: d.nombre.trim() || negocio.nombre, tax_regime: d.regimen, setup: { ...(await configuracionActual(negocio)), ...d.configuracion, arranque_listo: true } as Json })
    .eq('id', negocio.id);
  if (r1.error) return { error: r1.error, movidos: 0, errorTarjeta: false };

  for (const c of d.cuentas) {
    const fila = { name: c.nombre.trim(), initial_balance: Math.round(c.saldo) };
    const r = c.id
      ? await supabase.from('accounts').update(fila).eq('id', c.id)
      : await supabase.from('accounts').insert({ ...fila, owner_type: 'negocio', business_id: negocio.id, kind: iconoDeCuenta(c.nombre) === 'billetera' ? 'billetera' : 'banco' });
    if (r.error) return { error: r.error, movidos: 0, errorTarjeta: false };
  }

  let movidos = 0;
  for (const id of d.cuentasQuitadas) {
    const r = await supabase.rpc('quitar_cuenta_negocio', { cuenta: id });
    if (r.error) return { error: r.error, movidos, errorTarjeta: false };
    movidos += (r.data as number) ?? 0;
  }

  for (const t of d.tarjetas) {
    const fila = { name: t.nombre.trim(), credit_limit: Math.round(t.cupo), initial_debt: Math.round(t.deuda) };
    const r = t.id ? await supabase.from('credit_cards').update(fila).eq('id', t.id) : await supabase.from('credit_cards').insert({ ...fila, business_id: negocio.id });
    if (r.error) return { error: r.error, movidos, errorTarjeta: false };
  }
  for (const id of d.tarjetasQuitadas) {
    const r = await supabase.from('credit_cards').delete().eq('id', id);
    // Una tarjeta con movimientos no se puede borrar (la base de datos lo impide).
    if (r.error) return { error: r.error, movidos, errorTarjeta: true };
  }
  return { error: null, movidos, errorTarjeta: false };
}

export type DatosMovNegocio = {
  fecha: Fecha;
  tipo: TipoNegocio;
  monto: number;
  pagado: boolean;
  cuenta: string | null;
  tarjeta: string | null;
  concepto: string;
  contacto?: string | null;
  recurrente?: string | null;
};

export async function guardarMovNegocio(negocioId: string, d: DatosMovNegocio, id?: string) {
  if (modoEjemploActivo()) {
    // En el ejemplo se guarda solo en la memoria del celular (se borra al salir del ejemplo).
    guardarNegocioEnEjemplo(
      { fecha: d.fecha, tipo: d.tipo, monto: Math.round(d.monto), pagado: d.pagado, cuenta: d.pagado ? d.cuenta : null, tarjeta: d.pagado ? d.tarjeta : null, concepto: d.concepto.trim() || null, contacto: d.contacto ?? null, recurrente: d.recurrente ?? null },
      id,
    );
    return { error: null };
  }
  const fila = {
    owner_type: 'negocio',
    business_id: negocioId,
    date: d.fecha,
    kind: d.tipo,
    amount: Math.round(d.monto),
    paid: d.pagado,
    account_id: d.pagado ? d.cuenta : null,
    card_id: d.pagado ? d.tarjeta : null,
    description: d.concepto.trim() || null,
    contact_id: d.contacto ?? null,
    ...(d.recurrente !== undefined ? { recurring_id: d.recurrente } : {}),
  };
  return id ? supabase.from('movements').update(fila).eq('id', id) : supabase.from('movements').insert(fila);
}

export async function borrarMovNegocio(id: string) {
  if (modoEjemploActivo()) {
    borrarNegocioEnEjemplo(id);
    return { error: null };
  }
  return supabase.from('movements').delete().eq('id', id);
}

/** Parámetros de impuestos del año en curso o, si no hay, del más reciente (B7). */
export async function cargarParametrosImpuestos(anio: number) {
  const { data } = await supabase.from('tax_parameters').select('year, params').lte('year', anio).order('year', { ascending: false }).limit(1).maybeSingle();
  return data ? (data.params as unknown as import('@/lib/impuestos').ParametrosImpuestos) : null;
}

/** Cambia parte de la configuración del negocio (businesses.setup). Solo el dueño. */
export async function guardarConfiguracion(negocio: Negocio, cambios: Partial<Configuracion>, regimen?: Regimen | null) {
  if (modoEjemploActivo()) return sinGuardar();
  // Se lee la configuración actual del servidor: si la persona toca dos opciones seguidas, no se pierde la primera.
  const actual = await configuracionActual(negocio);
  return supabase
    .from('businesses')
    .update({ setup: { ...actual, ...cambios } as Json, ...(regimen !== undefined ? { tax_regime: regimen } : {}) })
    .eq('id', negocio.id);
}

/** Mover plata entre cuentas o pagar una tarjeta (regla B2/B3). */
export function guardarTraslado(negocioId: string, d: Omit<Transferencia, 'id'>) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('transfers').insert({
    business_id: negocioId,
    date: d.fecha,
    from_account: d.desde,
    to_account: d.haciaCuenta,
    to_card: d.haciaTarjeta,
    amount: Math.round(d.monto),
    note: d.nota?.trim() || null,
  });
}

export function borrarTraslado(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('transfers').delete().eq('id', id);
}

/** B11 · Guarda un cliente o proveedor (con la autorización de datos, Ley 1581). */
export function guardarContacto(negocioId: string, c: Omit<Contacto, 'id'>, id?: string) {
  if (modoEjemploActivo()) return sinGuardar();
  const limpio = (v: string) => v.trim() || null;
  const fila = {
    kind: c.tipo,
    name: c.nombre.trim(),
    doc_type: c.tipoDocumento,
    doc_number: limpio(c.documento),
    phone: limpio(c.celular),
    email: limpio(c.correo),
    address: limpio(c.direccion),
    city: limpio(c.ciudad),
    notes: limpio(c.notas),
    data_consent: true,
  };
  return id ? supabase.from('contacts').update(fila).eq('id', id).select('id').single() : supabase.from('contacts').insert({ ...fila, business_id: negocioId }).select('id').single();
}

export function borrarContacto(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('contacts').delete().eq('id', id);
}

/** B10 · Guarda un pago recurrente. */
export function guardarRecurrente(negocioId: string, r: Omit<Recurrente, 'id'>, id?: string) {
  if (modoEjemploActivo()) return sinGuardar();
  const fila = { name: r.nombre.trim(), kind: r.tipo, amount: Math.round(r.monto), day_of_month: r.dia, account_id: r.cuenta ?? null, active: r.activo };
  return id ? supabase.from('recurring_payments').update(fila).eq('id', id) : supabase.from('recurring_payments').insert({ ...fila, business_id: negocioId });
}

export function borrarRecurrente(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.from('recurring_payments').delete().eq('id', id);
}
