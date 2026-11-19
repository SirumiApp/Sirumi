// Fotos de los productos (spec 04, §3): se reducen a 240 px y se guardan en un bucket privado del negocio.

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { modoEjemploActivo, sinGuardar } from '@/ejemplo/modo';
import { supabase } from '@/lib/supabase';

const BUCKET = 'product-photos';
export const LADO_FOTO = 240;

/** Abre la cámara o la galería (pide permiso) y devuelve la imagen cuadrada, o null si la persona canceló o no dio permiso. */
export async function elegirFoto(origen: 'camara' | 'galeria'): Promise<string | null | 'sinPermiso'> {
  const permiso = origen === 'camara' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) return 'sinPermiso';
  const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 };
  const r = origen === 'camara' ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
  return r.canceled ? null : (r.assets[0]?.uri ?? null);
}

/** Reduce la foto a 240 px de ancho, en JPEG, y la devuelve como bytes. */
async function reducir(uri: string): Promise<Uint8Array> {
  const imagen = await ImageManipulator.manipulate(uri).resize({ width: LADO_FOTO }).renderAsync();
  const { base64 } = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  const binario = atob(base64 ?? '');
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

/** Sube (o reemplaza) la foto de un producto y la deja guardada en el producto. */
export async function subirFotoProducto(negocioId: string, productoId: string, uri: string) {
  if (modoEjemploActivo()) return sinGuardar();
  const ruta = `${negocioId}/${productoId}.jpg`;
  const bytes = await reducir(uri);
  const subida = await supabase.storage.from(BUCKET).upload(ruta, bytes, { contentType: 'image/jpeg', upsert: true });
  if (subida.error) return { error: subida.error };
  // La versión en la ruta hace que el celular no muestre la foto vieja guardada.
  return supabase.from('products').update({ photo_path: `${ruta}?v=${Date.now()}` }).eq('id', productoId);
}

export async function quitarFotoProducto(productoId: string, ruta: string) {
  if (modoEjemploActivo()) return sinGuardar();
  await supabase.storage.from(BUCKET).remove([ruta.split('?')[0]]);
  return supabase.from('products').update({ photo_path: null }).eq('id', productoId);
}

/** Enlaces temporales (1 día) para ver las fotos privadas. Clave: la ruta guardada en el producto. */
export async function enlacesDeFotos(rutas: string[]): Promise<Map<string, string>> {
  if (!rutas.length) return new Map();
  const limpias = rutas.map((r) => r.split('?')[0]);
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(limpias, 60 * 60 * 24);
  const mapa = new Map<string, string>();
  (data ?? []).forEach((d, i) => d.signedUrl && mapa.set(rutas[i], d.signedUrl));
  return mapa;
}
