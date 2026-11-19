import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaApp } from '@/components/PantallaApp';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { hoyEn } from '@/lib/fechas';
import { numeroVenta } from '@/lib/pos';
import { useNegocio } from '@/negocio/contexto';
import { usePlata } from '@/personal/ganchos';
import { ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

/** Lo que ve un vendedor en "Negocio": dónde vende, el botón Vender y sus ventas de hoy (como el staff en Shopify POS). */
export function VistaVendedor() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const { negocio, bodegas, ventas } = useNegocio();
  const hoy = hoyEn();
  const deHoy = ventas.filter((v) => v.fecha === hoy && v.estado !== 'devuelta');
  const bodega = bodegas.find((b) => b.id === negocio?.bodegaAsignada)?.nombre;

  return (
    <PantallaApp>
      <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
        <Emoji name="tienda" size={44} />
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta">{t('vendedores.vista.vendesEn')}</Texto>
          <Texto variante="subtitulo">{negocio?.nombre}</Texto>
          {bodega ? <Texto variante="pequeno">{t('vendedores.vista.desde', { bodega })}</Texto> : null}
        </View>
      </Tarjeta>

      <Boton titulo={`${t('pos.vender')}  →`} onPress={() => router.push('/pos')} />

      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="medio" color={colores.textoSuave}>
          {t('vendedores.vista.hoy')}
        </Texto>
        <Texto variante="heroe" numberOfLines={1} adjustsFontSizeToFit>
          {plata(deHoy.reduce((s, v) => s + v.total, 0))}
        </Texto>
        <Texto variante="pequeno">{t('negocioApp.informes.cierre.enVentas', { count: deHoy.length })}</Texto>
      </View>

      {deHoy.length === 0 && <Texto variante="suave">{t('vendedores.vista.sinVentas')}</Texto>}
      {deHoy.map((v) => (
        <Pressable
          key={v.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/pos/venta/[id]', params: { id: v.id } })}
          style={({ pressed }) => [
            { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, minHeight: 64, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.98 : 1 }] },
            sombraSuave(oscuro),
          ]}>
          <View style={{ flex: 1 }}>
            <Texto variante="fuerte">{numeroVenta(v.numero)}</Texto>
            <Texto variante="pequeno">{v.pagos.map((p) => p.nombre).join(' + ')}</Texto>
          </View>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }}>{plata(v.total)}</Texto>
        </Pressable>
      ))}
    </PantallaApp>
  );
}
