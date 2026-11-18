import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ALTO_TOCABLE, APARIENCIAS, ESPACIO, FUENTES, useTema, type Apariencia } from '@/theme';

import { Emoji, type NombreEmoji } from './emoji/Emoji';
import { Opcion } from './Opcion';
import { Texto } from './Texto';

const EMOJIS: Record<Apariencia, NombreEmoji> = { sistema: 'celular', oscuro: 'luna', claro: 'sol' };

/** Botón redondo (sol o luna) que abre la elección de apariencia: Sistema, Oscuro o Claro. */
export function BotonApariencia() {
  const { t } = useTranslation();
  const { colores, oscuro, apariencia, cambiarApariencia } = useTema();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('apariencia.boton')}
        onPress={() => setAbierto(true)}
        style={({ pressed }) => ({
          width: ALTO_TOCABLE,
          height: ALTO_TOCABLE,
          borderRadius: ALTO_TOCABLE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: colores.borde,
          opacity: pressed ? 0.8 : 1,
        })}>
        <Emoji name={oscuro ? 'luna' : 'sol'} size={24} />
      </Pressable>

      <Modal visible={abierto} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAbierto(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
          <View style={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Texto variante="titulo">{t('apariencia.titulo')}</Texto>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('comun.cerrar')}
                onPress={() => setAbierto(false)}
                style={{ minWidth: ALTO_TOCABLE, minHeight: ALTO_TOCABLE, alignItems: 'center', justifyContent: 'center' }}>
                <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 20 }}>✕</Texto>
              </Pressable>
            </View>
            <Texto variante="suave">{t('apariencia.detalle')}</Texto>
            <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
              {APARIENCIAS.map((a) => (
                <Opcion
                  key={a}
                  emoji={EMOJIS[a]}
                  titulo={t(`apariencia.${a}.titulo`)}
                  detalle={t(`apariencia.${a}.detalle`)}
                  elegida={apariencia === a}
                  onPress={() => {
                    cambiarApariencia(a);
                    setAbierto(false);
                  }}
                />
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
