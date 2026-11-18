import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { cargarApariencia, esOscuro, guardarApariencia, type Apariencia } from './apariencia';
import { COLORES_CLARO, COLORES_OSCURO, type Colores } from './colores';

export type Tema = {
  oscuro: boolean;
  colores: Colores;
  apariencia: Apariencia;
  cambiarApariencia: (apariencia: Apariencia) => void;
};

const TemaContexto = createContext<Tema>({
  oscuro: false,
  colores: COLORES_CLARO,
  apariencia: 'sistema',
  cambiarApariencia: () => {},
});

/** Modo claro u oscuro: el que elija la persona, o el del teléfono si elige "Sistema". */
export function ProveedorTema({ children }: { children: ReactNode }) {
  const esquema = useColorScheme();
  const [apariencia, setApariencia] = useState<Apariencia | null>(null);

  useEffect(() => {
    cargarApariencia().then(setApariencia);
  }, []);

  const cambiarApariencia = useCallback((nueva: Apariencia) => {
    setApariencia(nueva);
    guardarApariencia(nueva);
  }, []);

  const valor = useMemo<Tema>(() => {
    const preferencia = apariencia ?? 'sistema';
    const oscuro = esOscuro(preferencia, esquema);
    return { oscuro, colores: oscuro ? COLORES_OSCURO : COLORES_CLARO, apariencia: preferencia, cambiarApariencia };
  }, [apariencia, esquema, cambiarApariencia]);

  // Espera a leer la preferencia guardada para no mostrar un destello del modo equivocado.
  if (apariencia === null) return null;
  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>;
}

export function useTema(): Tema {
  return useContext(TemaContexto);
}
