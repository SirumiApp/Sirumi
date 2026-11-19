// Ventas hechas sin internet: se guardan en el celular (AsyncStorage) y se suben solas cuando vuelve la señal.
// Cada una lleva su id (client_id): si se envía dos veces, el servidor no la duplica.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { conLimite, esErrorDeConexion } from '@/lib/sinConexion';

import type { Comprobante } from './contexto';
import { cobrarVenta, type DatosCobro } from './datos';

export type VentaPendiente = {
  clientId: string;
  negocioId: string;
  datos: DatosCobro;
  /** Cuándo se hizo (hora del celular). */
  creada: string;
  comprobante: Comprobante;
  /** Si el servidor la rechazó por otra razón (no de conexión): queda para que la persona la revise. */
  error: string | null;
};

const CLAVE = 'sirumi.ventasPendientes';
let lista: VentaPendiente[] = [];
let cargada = false;
let subiendo = false;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

async function cargar() {
  if (cargada) return;
  cargada = true;
  try {
    const texto = await AsyncStorage.getItem(CLAVE);
    lista = texto ? (JSON.parse(texto) as VentaPendiente[]) : [];
  } catch {
    lista = [];
  }
  avisar();
}
cargar();

async function guardar(nueva: VentaPendiente[]) {
  lista = nueva;
  avisar();
  await AsyncStorage.setItem(CLAVE, JSON.stringify(lista)).catch(() => {});
}

export function useVentasPendientes(negocioId: string | null | undefined): VentaPendiente[] {
  const todas = useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => lista,
    () => lista,
  );
  return negocioId ? todas.filter((v) => v.negocioId === negocioId) : [];
}

export async function guardarSinInternet(v: Omit<VentaPendiente, 'error'>) {
  await cargar();
  await guardar([...lista, { ...v, error: null }]);
}

export async function descartarPendiente(clientId: string) {
  await guardar(lista.filter((v) => v.clientId !== clientId));
}

/**
 * Cobra con internet; si no hay (o no responde en 12 s), devuelve `{ sinInternet: true }` para guardarla en el celular.
 * El mismo `clientId` hace que un reintento no duplique la venta.
 */
export async function cobrarOGuardar(negocioId: string, datos: DatosCobro, clientId: string) {
  try {
    const r = await conLimite<{ data: unknown; error: { message?: string } | null }>(cobrarVenta(negocioId, { ...datos, clientId }), 12_000);
    if (r.error && esErrorDeConexion(r.error)) return { sinInternet: true as const, data: null, error: null };
    return { sinInternet: false as const, data: r.data as { id: string; number: number } | null, error: r.error };
  } catch (e) {
    if (esErrorDeConexion(e)) return { sinInternet: true as const, data: null, error: null };
    return { sinInternet: false as const, data: null, error: e as { message?: string } };
  }
}

/** Sube las ventas pendientes, una por una. Devuelve cuántas subió. Para si no hay internet. */
export async function subirPendientes(): Promise<number> {
  await cargar();
  if (subiendo || lista.length === 0) return 0;
  subiendo = true;
  let subidas = 0;
  try {
    for (const v of [...lista]) {
      if (v.error) continue;
      const r = await cobrarOGuardar(v.negocioId, { ...v.datos, sinConexion: true }, v.clientId);
      if (r.sinInternet) break;
      if (r.error || !r.data) {
        await guardar(lista.map((x) => (x.clientId === v.clientId ? { ...x, error: r.error?.message ?? 'error' } : x)));
        continue;
      }
      subidas++;
      await guardar(lista.filter((x) => x.clientId !== v.clientId));
    }
  } finally {
    subiendo = false;
  }
  return subidas;
}

/** Vuelve a intentar las que el servidor rechazó (p. ej. después de corregir algo). */
export async function reintentarRechazadas() {
  await guardar(lista.map((v) => ({ ...v, error: null })));
  return subirPendientes();
}
