import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { Emoji } from '@/components/emoji/Emoji';
import type { NombreEmoji } from '@/components/emoji/registro';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, modoEjemploActivo } from '@/ejemplo/modo';
import { elegirFoto } from '@/negocio/fotos';
import { ESPACIO, FUENTES, useTema } from '@/theme';

/** Foto del producto, o su emoji si no tiene. */
export function MiniaturaProducto({ url, emoji, tamano = 48 }: { url: string | null; emoji: string; tamano?: number }) {
  const { colores } = useTema();
  return (
    <View style={{ width: tamano, height: tamano, borderRadius: tamano / 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colores.seleccionado }}>
      {url ? <Image source={{ uri: url }} style={{ width: tamano, height: tamano }} contentFit="cover" accessibilityIgnoresInvertColors /> : <Emoji name={emoji as NombreEmoji} size={Math.round(tamano * 0.6)} />}
    </View>
  );
}

/**
 * Foto grande con "Cambiar foto": pregunta si tomarla o elegirla de la galería.
 * `onElegida` recibe la imagen local (la pantalla decide cuándo subirla); `onQuitar` aparece si ya hay foto.
 */
export function EditorFoto({ url, emoji, onElegida, onQuitar }: { url: string | null; emoji: string; onElegida: (uri: string) => Promise<void> | void; onQuitar?: () => void }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const [cargando, setCargando] = useState(false);

  async function desde(origen: 'camara' | 'galeria') {
    const r = await elegirFoto(origen);
    if (r === 'sinPermiso') return Alert.alert(t('inventario.foto.titulo'), t('inventario.foto.sinPermiso'));
    if (!r) return;
    setCargando(true);
    try {
      await onElegida(r);
    } finally {
      setCargando(false);
    }
  }

  function preguntar() {
    if (modoEjemploActivo()) return avisarEjemplo();
    Alert.alert(t('inventario.foto.titulo'), undefined, [
      { text: t('inventario.foto.tomar'), onPress: () => desde('camara') },
      { text: t('inventario.foto.galeria'), onPress: () => desde('galeria') },
      ...(url && onQuitar ? [{ text: t('inventario.foto.quitar'), style: 'destructive' as const, onPress: onQuitar }] : []),
      { text: t('movimiento.cancelar'), style: 'cancel' as const },
    ]);
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('inventario.foto.cambiar')} onPress={preguntar} style={{ alignItems: 'center', gap: ESPACIO.xs }}>
      <View>
        <MiniaturaProducto url={url} emoji={emoji} tamano={96} />
        {cargando && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colores.accion} />
          </View>
        )}
      </View>
      <Texto variante="pequeno" color={colores.enlace} style={{ fontFamily: FUENTES.textoFuerte }}>
        {url ? t('inventario.foto.cambiar') : t('inventario.foto.agregar')}
      </Texto>
    </Pressable>
  );
}
