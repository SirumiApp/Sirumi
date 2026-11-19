// Notificaciones del celular: avisos de venta (los manda el servidor) y recordatorios (los programa el celular).

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { t as traducir } from 'i18next';
import { Platform } from 'react-native';

import type { Fecha } from '@/lib/fechas';
import { supabase } from '@/lib/supabase';

export type EstadoAvisos = 'activos' | 'sinPermiso' | 'preguntar' | 'noDisponible';

// Con la app abierta también se muestran (como un banner arriba).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** ¿Se pueden pedir? En la web y en simuladores no hay notificaciones del celular. */
function disponible() {
  return Platform.OS !== 'web' && Device.isDevice;
}

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (!disponible()) return 'noDisponible';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'activos';
  return p.canAskAgain ? 'preguntar' : 'sinPermiso';
}

/** Guarda la dirección de notificaciones de este celular para que el servidor le avise las ventas. */
async function registrarEsteCelular(): Promise<boolean> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const { error } = await supabase.rpc('registrar_celular', { token_celular: token, plataforma: Platform.OS });
    return !error;
  } catch {
    // Expo Go en Android no recibe avisos del servidor: hace falta la app instalada.
    return false;
  }
}

/** Pide permiso (si hace falta) y registra el celular. */
export async function activarAvisos(): Promise<EstadoAvisos> {
  if (!disponible()) return 'noDisponible';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ventas', { name: traducir('notificaciones.canalVentas'), importance: AndroidImportance.HIGH, sound: 'default' });
    await Notifications.setNotificationChannelAsync('recordatorios', { name: traducir('notificaciones.canalRecordatorios'), importance: AndroidImportance.DEFAULT });
  }
  let p = await Notifications.getPermissionsAsync();
  if (!p.granted && p.canAskAgain) p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return 'sinPermiso';
  await registrarEsteCelular();
  return 'activos';
}

/** Al entrar con permiso ya dado: vuelve a registrar el celular (el token puede cambiar). */
export async function refrescarRegistro() {
  if ((await estadoAvisos()) === 'activos') await registrarEsteCelular();
}

/** Tocar el aviso de una venta abre esa venta. */
export function escucharToques(): () => void {
  if (Platform.OS === 'web') return () => {};
  const s = Notifications.addNotificationResponseReceivedListener((r) => {
    const data = r.notification.request.content.data as { tipo?: string; venta?: string; ambito?: string } | undefined;
    if (data?.tipo === 'venta' && data.venta) router.push({ pathname: '/pos/venta/[id]', params: { id: data.venta } });
    if (data?.tipo === 'recurrente') router.push({ pathname: '/recurrentes', params: { ambito: data.ambito ?? 'negocio' } });
    if (data?.tipo === 'impuesto') router.push('/impuestos');
    if (data?.tipo === 'extracto') router.push({ pathname: '/extractos', params: { ambito: data.ambito ?? 'negocio' } });
  });
  return () => s.remove();
}

const PREFIJO = 'sirumi-';
/** Los de versiones anteriores empezaban así. */
const PREFIJOS_VIEJOS = ['recurrente-'];
const esNuestro = (id: string) => id.startsWith(PREFIJO) || PREFIJOS_VIEJOS.some((p) => id.startsWith(p));

/** Un recordatorio local listo para mostrar (los textos ya traducidos). */
export type AvisoLocal = { clave: string; fecha: Fecha; titulo: string; cuerpo: string; data: Record<string, string> };

/**
 * Programa en el celular los recordatorios (pagos recurrentes, impuestos, extractos) a las 9 a. m. del día.
 * Borra los anteriores para que no queden repetidos ni de cosas que ya se hicieron.
 * iOS deja máximo 64 programados: se guardan los más cercanos.
 */
export async function programarAvisos(lista: AvisoLocal[]) {
  if ((await estadoAvisos()) !== 'activos') return;
  const programados = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(programados.filter((n) => esNuestro(n.identifier)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  const ahora = new Date();
  const proximos = [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 60);
  for (const r of proximos) {
    const [a, m, d] = r.fecha.split('-').map(Number);
    const cuando = new Date(a, m - 1, d, 9, 0, 0);
    if (cuando <= ahora) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: PREFIJO + r.clave,
      content: { title: r.titulo, body: r.cuerpo, data: r.data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: 'recordatorios' },
    });
  }
}

/** Quita todos los recordatorios programados (al cerrar sesión o al apagarlos en Ajustes). */
export async function quitarRecordatorios() {
  if (Platform.OS === 'web') return;
  const programados = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(programados.filter((n) => esNuestro(n.identifier)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}
