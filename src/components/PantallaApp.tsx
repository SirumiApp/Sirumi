import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ESPACIO } from '@/theme';

import { Encabezado } from './Encabezado';
import { Pantalla } from './Pantalla';

/** Pantalla dentro de la app: encabezado arriba y espacio abajo para que la barra flotante no tape el contenido. */
export function PantallaApp({ children }: { children: ReactNode }) {
  return (
    <Pantalla>
      <Encabezado />
      {children}
      <View style={{ height: 96 + ESPACIO.m }} />
    </Pantalla>
  );
}
