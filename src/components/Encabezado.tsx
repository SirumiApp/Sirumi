import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useUsoApp } from '@/auth/modo';
import { BandaEjemplo } from '@/ejemplo/BandaEjemplo';
import { ALTO_TOCABLE, ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

import { Icono, type NombreIcono } from './Icono';
import { Logo } from './Logo';
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
 * Encabezado de la app: la marca (cohete + sirumi) siempre visible, ajustes y luna/sol a la derecha y,
 * si la persona usa las dos partes, el interruptor Personal / Negocio debajo, a lo ancho.
 */
export function Encabezado() {
  const { t } = useTranslation();
  const { colores, oscuro, cambiarApariencia } = useTema();
  const ruta = usePathname();
  const enNegocio = RUTAS_NEGOCIO.some((r) => ruta.startsWith(r));
  const uso = useUsoApp() ?? 'ambos';

  const opcion = (activa: boolean, texto: string, destino: '/' | '/negocio') => (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      onPress={() => !activa && router.replace(destino)}
      style={{
        flex: 1,
        minHeight: ALTO_TOCABLE,
        paddingHorizontal: ESPACIO.l,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: activa ? colores.accion : 'transparent',
      }}>
      <Texto style={{ fontFamily: FUENTES.textoFuerte }} color={activa ? colores.textoSobreAccion : colores.textoSuave}>
        {texto}
      </Texto>
    </Pressable>
  );

  return (
    <View style={{ gap: ESPACIO.s + 4 }}>
      {/* La marca siempre arriba (recordación); a la derecha, ajustes y modo claro/oscuro. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <Logo tamano={26} />
        <View style={{ flex: 1 }} />
        <BotonRedondo icono="ajustes" etiqueta={t('navegacion.ajustes')} onPress={() => router.push('/ajustes')} />
        <BotonRedondo icono={oscuro ? 'sol' : 'luna'} etiqueta={t('navegacion.cambiarModo')} onPress={() => cambiarApariencia(oscuro ? 'claro' : 'oscuro')} />
      </View>
      {/* Si usa las dos partes: el interruptor Personal / Negocio, a lo ancho. */}
      {uso === 'ambos' && (
        <View
          accessibilityRole="tablist"
          style={[{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: colores.tarjeta }, sombraSuave(oscuro)]}>
          {opcion(!enNegocio, t('pestanas.personal'), '/')}
          {opcion(enNegocio, t('pestanas.negocio'), '/negocio')}
        </View>
      )}
      <BandaEjemplo />
    </View>
  );
}
