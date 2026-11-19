import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { todasLasFilas } from '@/lib/paginas';
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
  const { data, error } = await todasLasFilas((desde, hasta) =>
    supabase.from('movements').select('date, kind, amount, category_id, description').eq('owner_type', 'personal').order('date', { ascending: false }).order('id').range(desde, hasta),
  );
  if (error) throw error;
  return data ?? [];
}

/**
 * Copia de todo lo que Sirumi guarda de la persona (Ley 1581: derecho a conocer sus datos).
 * Las reglas de seguridad de la base de datos solo dejan leer lo propio.
 */
export async function misDatosCompletos(correo: string | undefined) {
  const tablas = ['profiles', 'consents', 'categories', 'movements', 'budgets', 'goals', 'debts', 'assets', 'net_worth_snapshots', 'accounts', 'business_members', 'businesses', 'warehouses', 'recurring_payments', 'statement_imports'] as const;
  const resultado: Record<string, unknown> = { exportado: new Date().toISOString(), correo };
  for (const tabla of tablas) {
    // Todo, por páginas (el servidor entrega máximo 1.000 filas por consulta).
    const { data, error } = await todasLasFilas((desde, hasta) => supabase.from(tabla).select('*').range(desde, hasta));
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

/** Abre el selector de archivos y devuelve el texto de un CSV, o null si la persona canceló. */
export async function leerArchivoCsv(): Promise<string | null> {
  const DocumentPicker = await import('expo-document-picker');
  const r = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', 'application/csv'],
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  const archivo = r.assets[0];
  if (Platform.OS === 'web') return (await fetch(archivo.uri)).text();
  return new File(archivo.uri).text();
}

/**
 * B9 · Abre el selector y lee un extracto (CSV o Excel .xlsx) como tabla de celdas, o null si la persona canceló.
 * Lanza Error('xls') con el Excel viejo (.xls): hay que guardarlo como .xlsx o CSV.
 */
export async function leerArchivoTabla(): Promise<{ nombre: string; filas: (string | number)[][] } | null> {
  const DocumentPicker = await import('expo-document-picker');
  const r = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  const archivo = r.assets[0];
  const nombre = archivo.name ?? 'extracto';
  const bytes = Platform.OS === 'web' ? new Uint8Array(await (await fetch(archivo.uri)).arrayBuffer()) : await new File(archivo.uri).bytes();
  // .xlsx es un zip (empieza con "PK"); el .xls viejo empieza con D0 CF 11 E0.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const { leerXlsx } = await import('@/lib/xlsx');
    return { nombre, filas: leerXlsx(bytes) };
  }
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) throw new Error('xls');
  const { separarCsv } = await import('@/lib/catalogo');
  let texto = new TextDecoder('utf-8').decode(bytes);
  // Los bancos a veces exportan en Latin-1: si salen caracteres raros, se vuelve a leer así.
  if (texto.includes('�')) texto = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return { nombre, filas: separarCsv(texto) };
}
