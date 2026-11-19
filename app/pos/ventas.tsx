import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Emoji } from '@/components/emoji/Emoji';
import { Texto } from '@/components/Texto';
import { hoyEn } from '@/lib/fechas';
import { numeroVenta } from '@/lib/pos';
import { useNegocio } from '@/negocio/contexto';
import { etiquetaDia } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { PantallaPos } from '@/pos/PantallaPos';
import { ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

/** Sirumi POS · Historial de ventas (spec 05, §4). */
export default function Ventas() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const { ventas, contactos, bodegas, movimientos } = useNegocio();
  const hoy = hoyEn();
  const nombreCliente = new Map(contactos.map((c) => [c.id, c.nombre]));
  const nombreBodega = new Map(bodegas.map((b) => [b.id, b.nombre]));
  const deHoy = ventas.filter((v) => v.fecha === hoy && v.estado !== 'devuelta');
  const cobrada = (id: string) => movimientos.some((m) => m.venta === id && m.pagado);

  return (
    <PantallaPos titulo={t('pos.historial.titulo')}>
      <Texto variante="suave">{t('pos.historial.detalle')}</Texto>
      {deHoy.length > 0 && (
        <Texto variante="fuerte">{t('pos.historial.deHoy', { monto: plata(deHoy.reduce((s, v) => s + v.total, 0)), count: deHoy.length })}</Texto>
      )}
      {ventas.length === 0 && (
        <View style={{ alignItems: 'center', gap: ESPACIO.s, paddingVertical: ESPACIO.l }}>
          <Emoji name="recibo" size={64} />
          <Texto variante="suave" style={{ textAlign: 'center' }}>
            {t('pos.historial.vacio')}
          </Texto>
        </View>
      )}
      {ventas.map((v) => {
        const etiqueta =
          v.estado === 'devuelta' ? t('pos.historial.devuelta') : v.estado === 'fiada' ? (cobrada(v.id) ? t('pos.historial.fiadaCobrada') : t('pos.historial.fiada')) : null;
        return (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/pos/venta/[id]', params: { id: v.id } })}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 72, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, opacity: v.estado === 'devuelta' ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              sombraSuave(oscuro),
            ]}>
            <View style={{ flex: 1 }}>
              <Texto variante="etiqueta" numberOfLines={1}>
                {numeroVenta(v.numero)} · {etiquetaDia(v.fecha, hoy, textosFecha)}
                {v.bodega && bodegas.length > 1 ? ` · ${nombreBodega.get(v.bodega) ?? ''}` : ''}
              </Texto>
              <Texto variante="fuerte" numberOfLines={1}>
                {(v.cliente && nombreCliente.get(v.cliente)) || t('pos.consumidorFinal')}
              </Texto>
              <Texto variante="pequeno" numberOfLines={1}>
                {v.pagos.map((p) => p.nombre).join(' + ')}
              </Texto>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22, textDecorationLine: v.estado === 'devuelta' ? 'line-through' : 'none' }}>{plata(v.total)}</Texto>
              {etiqueta && (
                <Texto variante="pequeno" color={v.estado === 'devuelta' ? colores.errorTexto : colores.avisoTexto} style={{ fontFamily: FUENTES.textoFuerte }}>
                  {etiqueta}
                </Texto>
              )}
            </View>
          </Pressable>
        );
      })}
    </PantallaPos>
  );
}
