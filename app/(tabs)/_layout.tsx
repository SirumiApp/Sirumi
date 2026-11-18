import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { ALTO_TOCABLE, FUENTES, sombraSuave, useTema } from '@/theme';

function IconoPestana({ name, activo }: { name: NombreEmoji; activo: boolean }) {
  return <Emoji name={name} size={26} style={{ opacity: activo ? 1 : 0.45 }} />;
}

/** Pestañas principales: Personal y Negocio (como en el prototipo). */
export default function PestanasLayout() {
  const { colores, oscuro } = useTema();
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.enlace,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarStyle: {
          backgroundColor: colores.tarjeta,
          borderTopWidth: 0,
          minHeight: ALTO_TOCABLE + 24,
          paddingTop: 6,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          ...sombraSuave(oscuro),
        },
        tabBarLabelStyle: { fontFamily: FUENTES.textoFuerte, fontSize: 12 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('pestanas.personal'),
          tabBarIcon: ({ focused }) => <IconoPestana name="persona" activo={focused} />,
        }}
      />
      <Tabs.Screen
        name="negocio"
        options={{
          title: t('pestanas.negocio'),
          tabBarIcon: ({ focused }) => <IconoPestana name="tienda" activo={focused} />,
        }}
      />
    </Tabs>
  );
}
