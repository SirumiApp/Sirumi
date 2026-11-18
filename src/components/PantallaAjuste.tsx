import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { BandaEjemplo } from '@/ejemplo/BandaEjemplo';
import { ALTO_TOCABLE, ESPACIO, sombraSuave, useTema } from '@/theme';

import { Icono } from './Icono';
import { Pantalla } from './Pantalla';
import { Texto } from './Texto';

/** Pantalla de Ajustes (como el prototipo): botón de volver redondo, título grande y el contenido. */
export function PantallaAjuste({ titulo, detalle, children }: { titulo: string; detalle?: string; children: ReactNode }) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comun.atras')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [
            {
              width: ALTO_TOCABLE,
              height: ALTO_TOCABLE,
              borderRadius: ALTO_TOCABLE / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colores.tarjeta,
              transform: [{ scale: pressed ? 0.93 : 1 }],
            },
            sombraSuave(oscuro),
          ]}>
          <Icono nombre="atras" tamano={20} />
        </Pressable>
        <Texto variante="titulo" style={{ flex: 1 }} accessibilityRole="header">
          {titulo}
        </Texto>
      </View>
      <BandaEjemplo />
      {detalle ? <Texto variante="suave">{detalle}</Texto> : null}
      {children}
      <View style={{ height: ESPACIO.xl }} />
    </Pantalla>
  );
}

/** Grupo de filas de Ajustes dentro de una tarjeta, con su título encima. */
export function GrupoAjustes({ titulo, children }: { titulo?: string; children: ReactNode }) {
  const { colores, oscuro } = useTema();
  return (
    <View style={{ gap: ESPACIO.s }}>
      {titulo ? <Texto variante="etiqueta">{titulo}</Texto> : null}
      <View style={[{ backgroundColor: colores.tarjeta, borderRadius: 20, paddingHorizontal: ESPACIO.m, paddingVertical: ESPACIO.xs }, sombraSuave(oscuro)]}>
        {children}
      </View>
    </View>
  );
}
