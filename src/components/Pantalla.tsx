import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ESPACIO, useTema } from '@/theme';

/** Contenedor base de cada pantalla: fondo de la marca, márgenes y scroll. */
export function Pantalla({ children }: { children: ReactNode }) {
  const { colores } = useTema();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.m, paddingBottom: ESPACIO.xl }}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
