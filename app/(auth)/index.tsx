import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { Pantalla } from '@/components/Pantalla';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Texto } from '@/components/Texto';
import { ESPACIO, FUENTES } from '@/theme';

export default function BienvenidaPantalla() {
  const { t } = useTranslation();
  return (
    <Pantalla>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: ESPACIO.m, paddingVertical: ESPACIO.xl }}>
        <Emoji name="cohete" size={140} />
        <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 44, lineHeight: 52 }}>sirumi</Texto>
        <Texto variante="subtitulo">{t('comun.lema')}</Texto>
        <Texto variante="suave" style={{ textAlign: 'center', maxWidth: 300 }}>
          {t('bienvenida.descripcion')}
        </Texto>
      </View>
      <View style={{ gap: ESPACIO.s }}>
        <View style={{ alignItems: 'center', marginBottom: ESPACIO.s }}>
          <SelectorIdioma />
        </View>
        <Boton titulo={t('bienvenida.crearCuenta')} onPress={() => router.push('/onboarding')} />
        <Boton titulo={t('bienvenida.yaTengoCuenta')} variante="secundario" onPress={() => router.push('/entrar')} />
      </View>
    </Pantalla>
  );
}
