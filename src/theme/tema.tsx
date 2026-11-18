import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { COLORES_CLARO, COLORES_OSCURO, type Colores } from './colores';

export type Tema = { oscuro: boolean; colores: Colores };

const TemaContexto = createContext<Tema>({ oscuro: false, colores: COLORES_CLARO });

/** Sigue el modo claro u oscuro del celular. */
export function ProveedorTema({ children }: { children: ReactNode }) {
  const oscuro = useColorScheme() === 'dark';
  const valor: Tema = { oscuro, colores: oscuro ? COLORES_OSCURO : COLORES_CLARO };
  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>;
}

export function useTema(): Tema {
  return useContext(TemaContexto);
}
