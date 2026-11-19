import { Stack } from 'expo-router';

import { ProveedorPos } from '@/pos/contexto';

/** Sirumi POS: el carrito vive mientras la persona está en estas pantallas. */
export default function LayoutPos() {
  return (
    <ProveedorPos>
      <Stack screenOptions={{ headerShown: false }} />
    </ProveedorPos>
  );
}
