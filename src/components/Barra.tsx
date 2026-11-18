import { View } from 'react-native';

import { useTema } from '@/theme';

/** Barra de progreso. `valor` entre 0 y 1 (se corta en 1). */
export function Barra({ valor, color, alto = 8 }: { valor: number; color?: string; alto?: number }) {
  const { colores } = useTema();
  return (
    <View style={{ height: alto, borderRadius: alto / 2, backgroundColor: colores.seleccionado, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(1, valor)) * 100}%`,
          height: '100%',
          borderRadius: alto / 2,
          backgroundColor: color ?? colores.accion,
        }}
      />
    </View>
  );
}
