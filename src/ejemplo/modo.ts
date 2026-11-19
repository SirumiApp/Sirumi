import AsyncStorage from '@react-native-async-storage/async-storage';
import { t as traducir } from 'i18next';
import { useSyncExternalStore } from 'react';
import { Alert } from 'react-native';

import { vaciarArenero } from './arenero';

// "Modo ejemplo": la app se llena con datos inventados (src/ejemplo/datosEjemplo.ts) para entenderla sin registrar nada.
// No lee ni escribe datos de la persona. Lo que se registre en el ejemplo (gastos, ventas) vive solo en la
// memoria del celular (./arenero.ts) y se borra al salir. Se recuerda en el celular.

const CLAVE = 'sirumi.modoEjemplo';
let activo = false;
const oyentes = new Set<() => void>();

AsyncStorage.getItem(CLAVE)
  .then((v) => {
    if (v === '1' && !activo) cambiarModoEjemplo(true, false);
  })
  .catch(() => {});

export function modoEjemploActivo(): boolean {
  return activo;
}

export function cambiarModoEjemplo(valor: boolean, guardar = true) {
  if (!valor) vaciarArenero();
  activo = valor;
  if (guardar) AsyncStorage.setItem(CLAVE, valor ? '1' : '0').catch(() => {});
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** ¿Se están mostrando datos de ejemplo? Las pantallas se vuelven a pintar al cambiarlo. */
export function useModoEjemplo(): boolean {
  return useSyncExternalStore(suscribir, modoEjemploActivo, modoEjemploActivo);
}

/** Avisa que en el modo ejemplo nada se guarda, y ofrece salir de él. */
export function avisarEjemplo() {
  Alert.alert(traducir('ejemplo.aviso.titulo'), traducir('ejemplo.aviso.detalle'), [
    { text: traducir('ejemplo.aviso.seguir'), style: 'cancel' },
    { text: traducir('ejemplo.aviso.salir'), onPress: () => cambiarModoEjemplo(false) },
  ]);
}

/**
 * Para las funciones que guardan: en el modo ejemplo no tocan la base de datos, avisan y responden "sin error".
 * Uso: `if (modoEjemploActivo()) return sinGuardar();`
 */
export function sinGuardar<T extends object = object>(extra?: T): Promise<{ error: null; data: null } & T> {
  avisarEjemplo();
  return Promise.resolve({ error: null, data: null, ...(extra as T) });
}
