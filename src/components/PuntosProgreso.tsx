import { View } from 'react-native';

import { ESPACIO, useTema } from '@/theme';

/** Barra con un punto por paso; se llenan los que ya pasaron. */
export function PuntosProgreso({ total, actual }: { total: number; actual: number }) {
  const { colores } = useTema();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: actual + 1 }}
      style={{ flexDirection: 'row', gap: ESPACIO.xs, flex: 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= actual ? colores.accion : colores.seleccionado }}
        />
      ))}
    </View>
  );
}
