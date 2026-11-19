import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Linking, Modal, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { Icono } from '@/components/Icono';
import { Texto } from '@/components/Texto';
import { ALTO_TOCABLE, COLOR_VENTA, ESPACIO, PALETA, useTema } from '@/theme';

type Props = {
  abierto: boolean;
  onCodigo: (codigo: string) => void;
  onCerrar: () => void;
  /** Como Shopify POS: la cámara sigue abierta y lee un producto tras otro (el mismo código espera 1,5 s). */
  continuo?: boolean;
  /** Lo último que pasó ("Agregado: Bolso"), en la parte de abajo. */
  mensaje?: { texto: string; tipo: 'ok' | 'error' } | null;
};

/** Escáner de códigos de barras con la cámara (spec 04: EAN-13, Code 128…). Sin `continuo`, lee una sola vez. */
export function Escaner({ abierto, onCodigo, onCerrar, continuo = false, mensaje }: Props) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const leido = useRef(false);
  const ultimo = useRef<{ codigo: string; cuando: number } | null>(null);

  return (
    <Modal visible={abierto} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCerrar} onShow={() => {
        leido.current = false;
        ultimo.current = null;
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
                const codigo = data?.trim();
                if (!codigo || leido.current) return;
                if (continuo) {
                  // El mismo código frente a la cámara no se suma varias veces seguidas.
                  const ahora = Date.now();
                  if (ultimo.current && ultimo.current.codigo === codigo && ahora - ultimo.current.cuando < 1500) return;
                  ultimo.current = { codigo, cuando: ahora };
                } else leido.current = true;
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onCodigo(codigo);
              }}
            />
            {/* Marco donde poner el código */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: '80%', height: 160, borderRadius: 20, borderWidth: 3, borderColor: colores.accion }} />
              <Texto color={PALETA.blanco} style={{ marginTop: ESPACIO.m, textAlign: 'center' }}>
                {t('inventario.escaner.ayuda')}
              </Texto>
            </View>
            {(mensaje || continuo) && (
              <View style={{ position: 'absolute', left: ESPACIO.m, right: ESPACIO.m, bottom: ESPACIO.m, gap: ESPACIO.s }}>
                {mensaje && (
                  <View accessibilityRole="alert" style={{ padding: ESPACIO.m, borderRadius: 18, backgroundColor: mensaje.tipo === 'ok' ? COLOR_VENTA.claro : colores.errorFondo }}>
                    <Texto variante="fuerte" color={mensaje.tipo === 'ok' ? PALETA.blanco : colores.errorTexto} style={{ textAlign: 'center' }}>
                      {mensaje.texto}
                    </Texto>
                  </View>
                )}
                {continuo && <Boton titulo={t('inventario.escaner.listo')} onPress={onCerrar} />}
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
