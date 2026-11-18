import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/** Crea un archivo temporal y abre el menú del celular para guardarlo o compartirlo (correo, Drive, WhatsApp…). */
export async function compartirArchivo(nombre: string, contenido: string, tipo: 'text/csv' | 'application/json') {
  if (Platform.OS === 'web') {
    // En el navegador: descarga directa.
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    enlace.download = nombre;
    enlace.click();
    return;
  }
  const archivo = new File(Paths.cache, nombre);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(contenido);
  await Sharing.shareAsync(archivo.uri, { mimeType: tipo, dialogTitle: nombre, UTI: tipo === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json' });
}

/** Todos los movimientos personales (de todas las fechas), del más reciente al más antiguo. */
export async function todosMisMovimientos() {
  const { data, error } = await supabase
    .from('movements')
    .select('date, kind, amount, category_id, description')
    .eq('owner_type', 'personal')
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Copia de todo lo que Sirumi guarda de la persona (Ley 1581: derecho a conocer sus datos).
 * Las reglas de seguridad de la base de datos solo dejan leer lo propio.
 */
export async function misDatosCompletos(correo: string | undefined) {
  const tablas = ['profiles', 'consents', 'categories', 'movements', 'budgets', 'goals', 'debts', 'assets', 'net_worth_snapshots', 'accounts', 'business_members', 'businesses', 'warehouses'] as const;
  const resultado: Record<string, unknown> = { exportado: new Date().toISOString(), correo };
  for (const tabla of tablas) {
    const { data, error } = await supabase.from(tabla).select('*');
    if (error) throw error;
    resultado[tabla] = data ?? [];
  }
  return resultado;
}

export async function eliminarMiCuenta() {
  const { error } = await supabase.rpc('eliminar_mi_cuenta');
  if (error) return { error };
  await supabase.auth.signOut();
  return { error: null };
}
