import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { Icono } from '@/components/Icono';
import { Texto } from '@/components/Texto';
import { ALTO_TOCABLE, ESPACIO, PALETA, useTema } from '@/theme';

/** Escáner de códigos de barras con la cámara (spec 04: EAN-13 y Code 128). Llama a `onCodigo` una sola vez. */
export function Escaner({ abierto, onCodigo, onCerrar }: { abierto: boolean; onCodigo: (codigo: string) => void; onCerrar: () => void }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const leido = useRef(false);

  return (
    <Modal visible={abierto} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} onShow={() => {
        leido.current = false;
      }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: PALETA.noche }} edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, padding: ESPACIO.m }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('comun.cerrar')}
            onPress={onCerrar}
            style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETA.blanco }}>
            <Icono nombre="cerrar" tamano={18} color={PALETA.noche} />
          </Pressable>
          <Texto variante="subtitulo" color={PALETA.blanco} style={{ flex: 1 }}>
            {t('inventario.escaner.titulo')}
          </Texto>
        </View>

        {!permiso ? null : !permiso.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: ESPACIO.m, padding: ESPACIO.l }}>
            <Emoji name="camara" size={64} />
            <Texto color={PALETA.blanco} style={{ textAlign: 'center' }}>
              {t('inventario.escaner.permiso')}
            </Texto>
            <Boton
              titulo={permiso.canAskAgain ? t('inventario.escaner.darPermiso') : t('inventario.escaner.abrirAjustes')}
              onPress={() => (permiso.canAskAgain ? pedirPermiso() : Linking.openSettings())}
            />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
              onBarcodeScanned={({ data }) => {
                if (leido.current || !data) return;
                leido.current = true;
                onCodigo(data.trim());
              }}
            />
            {/* Marco donde poner el código */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: '80%', height: 160, borderRadius: 20, borderWidth: 3, borderColor: colores.accion }} />
              <Texto color={PALETA.blanco} style={{ marginTop: ESPACIO.m, textAlign: 'center' }}>
                {t('inventario.escaner.ayuda')}
              </Texto>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
