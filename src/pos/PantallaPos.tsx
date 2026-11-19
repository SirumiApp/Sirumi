import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icono } from '@/components/Icono';
import { Texto } from '@/components/Texto';
import { BandaEjemplo } from '@/ejemplo/BandaEjemplo';
import { ALTO_TOCABLE, ESPACIO, sombraSuave, useTema } from '@/theme';

/** Pantalla del POS: volver, título, algo a la derecha, contenido con scroll y una barra fija abajo. */
export function PantallaPos({ titulo, derecha, pie, children, onAtras }: { titulo: string; derecha?: ReactNode; pie?: ReactNode; children: ReactNode; onAtras?: () => void }) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, paddingHorizontal: ESPACIO.m, paddingTop: ESPACIO.s }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('comun.atras')}
            onPress={onAtras ?? (() => (router.canGoBack() ? router.back() : router.replace('/negocio')))}
            style={({ pressed }) => [
              { width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.93 : 1 }] },
              sombraSuave(oscuro),
            ]}>
            <Icono nombre="atras" tamano={20} />
          </Pressable>
          <Texto variante="titulo" style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">
            {titulo}
          </Texto>
          {derecha}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.m, paddingBottom: pie ? 120 : ESPACIO.xl }}>
          <BandaEjemplo />
          {children}
        </ScrollView>
        {pie ? (
          <View style={[{ position: 'absolute', left: ESPACIO.m, right: ESPACIO.m, bottom: ESPACIO.m, borderRadius: 24, backgroundColor: colores.tarjeta, padding: ESPACIO.s }, sombraSuave(oscuro)]}>{pie}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
