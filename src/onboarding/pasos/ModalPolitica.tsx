import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { Texto } from '@/components/Texto';
import { ALTO_TOCABLE, ESPACIO, FUENTES, useTema } from '@/theme';

import { politicas, type FilaPolitica } from '../politica';

export type TipoPolitica = 'co' | 'int';

/** La política completa, para leerla antes de aceptar. */
export function ModalPolitica({ abierta, inicial, onCerrar }: { abierta: TipoPolitica | null; inicial?: TipoPolitica; onCerrar: () => void }) {
  const { colores } = useTema();
  const { t, i18n } = useTranslation();
  const [pestana, setPestana] = useState<TipoPolitica>(inicial ?? 'co');
  const [ultimaAbierta, setUltimaAbierta] = useState<TipoPolitica | null>(abierta);

  // Al abrir, muestra la que se pidió.
  if (abierta !== ultimaAbierta) {
    setUltimaAbierta(abierta);
    if (abierta) setPestana(abierta);
  }

  const textos = politicas(i18n.language);
  const filas: FilaPolitica[] = pestana === 'co' ? textos.colombia : textos.internacional;

  return (
    <Modal visible={abierta !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: ESPACIO.m }}>
          <Texto variante="subtitulo">{t('onboarding.politica.titulo')}</Texto>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('comun.cerrar')}
            onPress={onCerrar}
            style={{ minWidth: ALTO_TOCABLE, minHeight: ALTO_TOCABLE, alignItems: 'center', justifyContent: 'center' }}>
            <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 20 }}>✕</Texto>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }} accessibilityRole="tablist">
          <Chip texto={t('onboarding.politica.colombia')} elegido={pestana === 'co'} onPress={() => setPestana('co')} />
          <Chip texto={t('onboarding.politica.internacional')} elegido={pestana === 'int'} onPress={() => setPestana('int')} />
        </View>
        <ScrollView contentContainerStyle={{ padding: ESPACIO.m, paddingBottom: ESPACIO.xl }}>
          {filas.map((fila, i) =>
            fila.tipo === 't' ? (
              <Texto key={i} variante="titulo" style={{ marginTop: ESPACIO.s }}>
                {fila.texto}
              </Texto>
            ) : fila.tipo === 'h' ? (
              <Texto key={i} variante="subtitulo" style={{ marginTop: ESPACIO.l }}>
                {fila.texto}
              </Texto>
            ) : (
              <Texto key={i} style={{ marginTop: ESPACIO.s }}>
                {fila.texto}
              </Texto>
            ),
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
