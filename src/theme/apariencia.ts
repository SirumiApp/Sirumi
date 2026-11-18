import AsyncStorage from '@react-native-async-storage/async-storage';

export type Apariencia = 'sistema' | 'claro' | 'oscuro';
export const APARIENCIAS: Apariencia[] = ['sistema', 'oscuro', 'claro'];

const CLAVE = 'sirumi.apariencia';

/** ¿Se ve en modo oscuro? "Sistema" sigue al teléfono; "Claro" y "Oscuro" mandan. */
export function esOscuro(preferencia: Apariencia, esquemaSistema: string | null | undefined): boolean {
  if (preferencia === 'sistema') return esquemaSistema === 'dark';
  return preferencia === 'oscuro';
}

export async function cargarApariencia(): Promise<Apariencia> {
  try {
    const guardada = await AsyncStorage.getItem(CLAVE);
    return APARIENCIAS.includes(guardada as Apariencia) ? (guardada as Apariencia) : 'sistema';
  } catch {
    return 'sistema';
  }
}

export async function guardarApariencia(apariencia: Apariencia) {
  try {
    await AsyncStorage.setItem(CLAVE, apariencia);
  } catch {
    // Si no se puede guardar, igual se aplica mientras la app esté abierta.
  }
}
