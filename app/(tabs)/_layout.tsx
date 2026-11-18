import { Tabs } from 'expo-router';

import { BarraFlotante } from '@/components/BarraFlotante';
import { ProveedorPersonal } from '@/personal/contexto';

/**
 * Navegación principal (como el prototipo): arriba, Personal / Negocio; abajo, una barra flotante
 * con el + en el centro. Personal: Inicio · Análisis · + · Topes. Negocio: Resumen · Caja · + · Resultados · Más.
 */
export default function PestanasLayout() {
  return (
    <ProveedorPersonal>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BarraFlotante {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="analisis" />
        <Tabs.Screen name="topes" />
        <Tabs.Screen name="negocio" />
        <Tabs.Screen name="caja" />
        <Tabs.Screen name="resultados" />
        <Tabs.Screen name="mas" />
      </Tabs>
    </ProveedorPersonal>
  );
}
