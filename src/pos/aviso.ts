// Aviso de venta (spec 05, §3): sonido de caja registradora y una vibración corta. Se puede apagar en Ajustes.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let reproductor: AudioPlayer | null = null;

export async function avisarVenta(conSonido: boolean) {
  if (!conSonido) return;
  try {
    if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!reproductor) {
      // Que suene aunque el iPhone esté en silencio (es un aviso de la caja).
      await setAudioModeAsync({ playsInSilentMode: true });
      reproductor = createAudioPlayer(require('../../assets/sonidos/caja.wav'));
    }
    reproductor.seekTo(0);
    reproductor.play();
  } catch {
    // Si el celular no deja sonar o vibrar, la venta igual queda guardada.
  }
}

/** Preferencia guardada en profiles.preferences.pos.sonido (por defecto, sí). */
export function sonidoActivo(preferencias: unknown): boolean {
  return (preferencias as { pos?: { sonido?: boolean } } | null)?.pos?.sonido !== false;
}
