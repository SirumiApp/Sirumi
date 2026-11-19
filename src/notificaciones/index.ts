// Notificaciones del celular: avisos de venta (los manda el servidor) y recordatorios (los programa el celular).

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { t as traducir } from 'i18next';
import { Platform } from 'react-native';

import type { Fecha } from '@/lib/fechas';
import type { Recordatorio } from '@/lib/recordatorios';
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
    const data = r.notification.request.content.data as { tipo?: string; venta?: string } | undefined;
    if (data?.tipo === 'venta' && data.venta) router.push({ pathname: '/pos/venta/[id]', params: { id: data.venta } });
    if (data?.tipo === 'recurrente') router.push('/recurrentes');
  });
  return () => s.remove();
}

const PREFIJO = 'recurrente-';

/**
 * Programa en el celular los recordatorios de pagos recurrentes (a las 9 a. m. del día que vence).
 * Borra los anteriores para que no queden repetidos ni de pagos que ya se hicieron.
 */
export async function programarRecordatorios(lista: Recordatorio[], plata: (v: number) => string, hoy: Fecha) {
  if ((await estadoAvisos()) !== 'activos') return;
  const programados = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(programados.filter((n) => n.identifier.startsWith(PREFIJO)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  const ahora = new Date();
  for (const r of lista) {
    const [a, m, d] = r.fecha.split('-').map(Number);
    const cuando = new Date(a, m - 1, d, 9, 0, 0);
    if (cuando <= ahora) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: r.clave,
      content: {
        title: r.fecha === hoy ? traducir('notificaciones.recurrenteHoy') : traducir('notificaciones.recurrente'),
        body: `${r.recurrente.nombre} · ${plata(r.recurrente.monto)}`,
        data: { tipo: 'recurrente', recurrente: r.recurrente.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: 'recordatorios' },
    });
  }
}

/** Quita todos los recordatorios programados (al cerrar sesión o al apagarlos en Ajustes). */
export async function quitarRecordatorios() {
  if (Platform.OS === 'web') return;
  const programados = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(programados.filter((n) => n.identifier.startsWith(PREFIJO)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}
