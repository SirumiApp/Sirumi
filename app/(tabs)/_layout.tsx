import { Tabs } from 'expo-router';

import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { ALTO_TOCABLE, FUENTES, useTema } from '@/theme';

function IconoPestana({ name, activo }: { name: NombreEmoji; activo: boolean }) {
  return <Emoji name={name} size={26} style={{ opacity: activo ? 1 : 0.45 }} />;
}

/** Pestañas principales: Personal y Negocio (como en el prototipo). */
export default function PestanasLayout() {
  const { colores } = useTema();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.texto,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarStyle: {
          backgroundColor: colores.tarjeta,
          borderTopColor: colores.borde,
          minHeight: ALTO_TOCABLE + 20,
        },
        tabBarLabelStyle: { fontFamily: FUENTES.textoFuerte, fontSize: 12 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Personal',
          tabBarIcon: ({ focused }) => <IconoPestana name="persona" activo={focused} />,
        }}
      />
      <Tabs.Screen
        name="negocio"
        options={{
          title: 'Negocio',
          tabBarIcon: ({ focused }) => <IconoPestana name="tienda" activo={focused} />,
        }}
      />
    </Tabs>
  );
}
