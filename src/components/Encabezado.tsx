import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cerrarSesion } from '@/auth/sesion';
import { ALTO_TOCABLE, ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

import { BotonApariencia } from './BotonApariencia';
import { Boton } from './Boton';
import { Icono, type NombreIcono } from './Icono';
import { SelectorIdioma } from './SelectorIdioma';
import { Texto } from './Texto';

/** Rutas de negocio: con ellas el interruptor de arriba queda en "Negocio". */
export const RUTAS_NEGOCIO = ['/negocio', '/caja', '/resultados', '/mas'];

function BotonRedondo({ icono, etiqueta, onPress }: { icono: NombreIcono; etiqueta: string; onPress: () => void }) {
  const { colores, oscuro } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: ALTO_TOCABLE,
          height: ALTO_TOCABLE,
          borderRadius: ALTO_TOCABLE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colores.tarjeta,
          transform: [{ scale: pressed ? 0.93 : 1 }],
        },
        sombraSuave(oscuro),
      ]}>
      <Icono nombre={icono} tamano={20} />
    </Pressable>
  );
}

/**
 * Encabezado de la app (como en el prototipo): interruptor Personal / Negocio y, a la derecha,
 * ajustes rápidos y luna/sol para cambiar entre modo claro y oscuro.
 */
export function Encabezado() {
  const { t } = useTranslation();
  const { colores, oscuro, cambiarApariencia } = useTema();
  const ruta = usePathname();
  const enNegocio = RUTAS_NEGOCIO.some((r) => ruta.startsWith(r));
  const [ajustes, setAjustes] = useState(false);

  const opcion = (activa: boolean, texto: string, destino: '/' | '/negocio') => (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      onPress={() => !activa && router.replace(destino)}
      style={{
        minHeight: ALTO_TOCABLE,
        paddingHorizontal: ESPACIO.l,
        borderRadius: 999,
        justifyContent: 'center',
        backgroundColor: activa ? colores.accion : 'transparent',
      }}>
      <Texto style={{ fontFamily: FUENTES.textoFuerte }} color={activa ? colores.textoSobreAccion : colores.textoSuave}>
        {texto}
      </Texto>
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
      <View
        accessibilityRole="tablist"
        style={[{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: colores.tarjeta }, sombraSuave(oscuro)]}>
        {opcion(!enNegocio, t('pestanas.personal'), '/')}
        {opcion(enNegocio, t('pestanas.negocio'), '/negocio')}
      </View>
      <View style={{ flex: 1 }} />
      <BotonRedondo icono="ajustes" etiqueta={t('navegacion.ajustes')} onPress={() => setAjustes(true)} />
      <BotonRedondo icono={oscuro ? 'sol' : 'luna'} etiqueta={t('navegacion.cambiarModo')} onPress={() => cambiarApariencia(oscuro ? 'claro' : 'oscuro')} />

      <Modal visible={ajustes} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAjustes(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
          <View style={{ padding: ESPACIO.m, gap: ESPACIO.l }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
              <BotonRedondo icono="cerrar" etiqueta={t('comun.cerrar')} onPress={() => setAjustes(false)} />
              <Texto variante="titulo">{t('navegacion.ajustes')}</Texto>
            </View>
            <View style={{ gap: ESPACIO.s }}>
              <Texto variante="fuerte">{t('comun.idioma')}</Texto>
              <SelectorIdioma />
            </View>
            <View style={{ gap: ESPACIO.s }}>
              <Texto variante="fuerte">{t('apariencia.titulo')}</Texto>
              <View style={{ flexDirection: 'row' }}>
                <BotonApariencia />
              </View>
            </View>
            <Boton
              titulo={t('comun.cerrarSesion')}
              variante="secundario"
              onPress={() => {
                setAjustes(false);
                cerrarSesion();
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
