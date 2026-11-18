import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Emoji } from '@/components/emoji/Emoji';
import type { NombreEmoji } from '@/components/emoji/registro';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { porReponer, stockDeProducto, valorInventario } from '@/lib/inventario';
import { useNegocio } from '@/negocio/contexto';
import { paraReglas } from '@/negocio/inventarioDatos';
import { usePlata } from '@/personal/ganchos';
import { ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Inventario (spec 04, §2): valor a costo y a precio (C5), productos con unidades por bodega y "Reponer". */
export default function Inventario() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const ejemplo = useModoEjemplo();
  const { negocio, bodegas, productos, stock } = useNegocio();
  const [bodega, setBodega] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const reglas = paraReglas(productos);
  const valor = valorInventario(reglas, stock, bodega ?? undefined);
  const reponer = reglas.filter((p) => porReponer(p, stock)).length;
  const texto = sinTildes(busqueda.trim());
  const lista = productos.filter(
    (p) => !texto || sinTildes(p.nombre).includes(texto) || sinTildes(p.coleccion ?? '').includes(texto) || p.variantes.some((v) => v.codigo?.includes(texto)),
  );
  const nombreBodega = new Map(bodegas.map((b) => [b.id, b.nombre]));

  return (
    <PantallaAjuste titulo={t('inventario.titulo')} detalle={t('inventario.detalle')}>
      {bodegas.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }} contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}>
          <Chip texto={t('inventario.todas')} elegido={bodega === null} onPress={() => setBodega(null)} />
          {bodegas.map((b) => (
            <Chip key={b.id} texto={b.nombre} elegido={bodega === b.id} onPress={() => setBodega(b.id)} />
          ))}
        </ScrollView>
      )}

      {productos.length > 0 && (
        <Tarjeta>
          <Texto variante="etiqueta">{t('inventario.aCosto')}</Texto>
          <Texto variante="cifra">{plata(valor.aCosto)}</Texto>
          <Texto variante="pequeno">{t('inventario.unidades', { count: valor.unidades })}</Texto>
          <View style={{ flexDirection: 'row', gap: ESPACIO.m, marginTop: ESPACIO.s }}>
            <View style={{ flex: 1 }}>
              <Texto variante="etiqueta">{t('inventario.aPrecio')}</Texto>
              <Texto variante="fuerte">{plata(valor.aPrecio)}</Texto>
            </View>
            <View style={{ flex: 1 }}>
              <Texto variante="etiqueta">{t('inventario.ganancia')}</Texto>
              <Texto variante="fuerte" color={colores.ingresoTexto}>
                {plata(valor.ganancia)}
              </Texto>
            </View>
          </View>
          {reponer > 0 && (
            <View style={{ alignSelf: 'flex-start', marginTop: ESPACIO.xs, paddingHorizontal: ESPACIO.s + 4, paddingVertical: 4, borderRadius: 999, backgroundColor: colores.avisoFondo }}>
              <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={colores.avisoTexto}>
                {t('inventario.porReponer', { count: reponer })}
              </Texto>
            </View>
          )}
        </Tarjeta>
      )}

      <Boton titulo={t('inventario.nuevo')} onPress={() => (ejemplo ? avisarEjemplo() : router.push({ pathname: '/inventario/[id]', params: { id: 'nuevo' } }))} />
      <Boton titulo={t('inventario.bodegas')} variante="secundario" onPress={() => router.push('/inventario/bodegas')} />

      {productos.length > 6 && <CampoTexto etiqueta="" accessibilityLabel={t('inventario.buscar')} placeholder={t('inventario.buscar')} value={busqueda} onChangeText={setBusqueda} />}

      {negocio && productos.length === 0 && (
        <View style={{ alignItems: 'center', gap: ESPACIO.s, paddingVertical: ESPACIO.l }}>
          <Emoji name="paquete" size={64} />
          <Texto variante="suave" style={{ textAlign: 'center' }}>
            {t('inventario.vacio')}
          </Texto>
        </View>
      )}
      {productos.length > 0 && lista.length === 0 && <Texto variante="suave">{t('inventario.sinResultados')}</Texto>}

      {lista.map((p) => {
        const ids = p.variantes.map((v) => v.id);
        const unidades = stockDeProducto(ids, stock, bodega ?? undefined);
        const total = stockDeProducto(ids, stock);
        const bajo = porReponer({ ...p, variantes: ids }, stock);
        const reparto =
          bodega === null && bodegas.length > 1
            ? bodegas
                .map((b) => ({ n: nombreBodega.get(b.id), u: stockDeProducto(ids, stock, b.id) }))
                .filter((x) => x.u > 0)
                .map((x) => `${x.n} ${x.u}`)
                .join(' · ')
            : '';
        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/inventario/[id]', params: { id: p.id } })}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 76, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.98 : 1 }] },
              sombraSuave(oscuro),
            ]}>
            <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.seleccionado }}>
              <Emoji name={p.emoji as NombreEmoji} size={28} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Texto variante="fuerte" numberOfLines={1}>
                {p.nombre}
              </Texto>
              <Texto variante="pequeno" numberOfLines={1}>
                {[plata(p.precio), p.coleccion].filter(Boolean).join(' · ')}
              </Texto>
              {reparto ? (
                <Texto variante="pequeno" numberOfLines={1}>
                  {reparto}
                </Texto>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }} color={unidades === 0 ? colores.errorTexto : colores.texto}>
                {total === 0 ? t('inventario.agotado') : t('inventario.unidades', { count: unidades })}
              </Texto>
              {bajo && total > 0 && (
                <Texto variante="pequeno" color={colores.avisoTexto} style={{ fontFamily: FUENTES.textoFuerte }}>
                  {t('inventario.reponer')}
                </Texto>
              )}
            </View>
          </Pressable>
        );
      })}
    </PantallaAjuste>
  );
}
