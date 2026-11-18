import type { ReactNode, RefObject } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ESPACIO, useTema } from '@/theme';

type Props = {
  children: ReactNode;
  /** Deja el borde de arriba al encabezado de la navegación. */
  conEncabezado?: boolean;
  /** Para subir al inicio al cambiar de paso. */
  refScroll?: RefObject<ScrollViewInstance | null>;
};

/** Contenedor base de cada pantalla: fondo de la marca, márgenes, scroll y teclado. */
export function Pantalla({ children, conEncabezado = false, refScroll }: Props) {
  const { colores } = useTema();
  return (
    <SafeAreaView edges={conEncabezado ? [] : ['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={refScroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.m, paddingBottom: ESPACIO.xl, flexGrow: 1 }}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
