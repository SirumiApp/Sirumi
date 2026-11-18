import { Pressable, View } from 'react-native';

import { PALETA, useTema } from '@/theme';

/** Interruptor de encendido/apagado (como el del prototipo y el de iPhone). Toda la fila que lo contiene puede tocarse. */
export function Interruptor({ encendido, onCambio, etiqueta }: { encendido: boolean; onCambio: (valor: boolean) => void; etiqueta: string }) {
  const { colores, oscuro } = useTema();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: encendido }}
      onPress={() => onCambio(!encendido)}
      hitSlop={8}
      style={{
        width: 52,
        height: 32,
        borderRadius: 16,
        padding: 3,
        justifyContent: 'center',
        alignItems: encendido ? 'flex-end' : 'flex-start',
        backgroundColor: encendido ? colores.accion : oscuro ? '#33405C' : '#C9D4E8',
      }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: PALETA.blanco }} />
    </Pressable>
  );
}
