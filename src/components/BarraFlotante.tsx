import { router, type Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNegocio } from '@/negocio/contexto';
import { usePersonal } from '@/personal/contexto';
import { ESPACIO, FUENTES, sombraAccion, sombraFlotante, useTema } from '@/theme';

import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

/** Lo que expo-router le pasa a una barra de pestañas propia. */
export type PropsBarra = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type Item = { ruta: string; icono: NombreIcono; etiqueta: 'inicio' | 'analisis' | 'topes' | 'resumen' | 'caja' | 'resultados' | 'mas' };

const PERSONAL: (Item | '+')[] = [
  { ruta: 'index', icono: 'casa', etiqueta: 'inicio' },
  { ruta: 'analisis', icono: 'grafica', etiqueta: 'analisis' },
  '+',
  { ruta: 'topes', icono: 'moneda', etiqueta: 'topes' },
];
const NEGOCIO: (Item | '+')[] = [
  { ruta: 'negocio', icono: 'casa', etiqueta: 'resumen' },
  { ruta: 'caja', icono: 'cartera', etiqueta: 'caja' },
  '+',
  { ruta: 'resultados', icono: 'grafica', etiqueta: 'resultados' },
  { ruta: 'mas', icono: 'cuadricula', etiqueta: 'mas' },
];

/** Barra flotante de abajo con el botón + en el centro (como en el prototipo). Cambia según Personal o Negocio. */
export function BarraFlotante({ state, navigateToTab }: PropsBarra) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const { abrirHoja } = usePersonal();
  const negocio = useNegocio();
  const abajo = useSafeAreaInsets().bottom;
  const actual = state.routes[state.index]?.name;
  const enNegocio = NEGOCIO.some((i) => i !== '+' && i.ruta === actual);
  const vendedor = negocio.negocio?.rol === 'seller';
  // El vendedor solo tiene su resumen de ventas y el + abre el POS.
  const items = enNegocio ? (vendedor ? NEGOCIO.filter((i) => i === '+' || i.ruta === 'negocio') : NEGOCIO) : PERSONAL;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: ESPACIO.m, right: ESPACIO.m, bottom: Math.max(abajo, ESPACIO.s) + 4 }}>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            height: 68,
            borderRadius: 999,
            paddingHorizontal: ESPACIO.s,
            backgroundColor: colores.tarjeta,
          },
          sombraFlotante(oscuro),
        ]}>
        {items.map((item) => {
          if (item === '+') {
            return (
              <View key="mas-centro" style={{ flex: 1, alignItems: 'center' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('navegacion.agregar')}
                  onPress={() => (enNegocio ? (vendedor ? router.push('/pos') : negocio.abrirHoja(null)) : abrirHoja(null))}
                  style={({ pressed }) => [
                    {
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colores.accion,
                      transform: [{ scale: pressed ? 0.92 : 1 }],
                    },
                    sombraAccion(oscuro),
                  ]}>
                  <Icono nombre="mas" tamano={28} color={colores.textoSobreAccion} grosor={2.4} />
                </Pressable>
              </View>
            );
          }
          const activo = item.ruta === actual;
          const color = activo ? colores.enlace : colores.textoSuave;
          return (
            <Pressable
              key={item.ruta}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={t(`navegacion.${item.etiqueta}`)}
              onPress={() => {
                const destino = state.routes.find((r) => r.name === item.ruta);
                if (!activo && destino) navigateToTab(destino.key);
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 56 }}>
              <Icono nombre={item.icono} tamano={22} color={color} />
              <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 11, lineHeight: 14 }} color={color}>
                {t(`navegacion.${item.etiqueta}`)}
              </Texto>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
