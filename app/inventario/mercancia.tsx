import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { hoyEn } from '@/lib/fechas';
import { fechaCorta } from '@/personal/etiquetas';
import { useTextosFecha } from '@/personal/ganchos';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Icono } from '@/components/Icono';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { useModoEjemplo } from '@/ejemplo/modo';
import { Escaner } from '@/inventario/Escaner';
import { MiniaturaProducto } from '@/inventario/Foto';
import { CampoCantidad } from '@/inventario/Piezas';
import { stockDeVariante, validarSalida } from '@/lib/inventario';
import { useNegocio } from '@/negocio/contexto';
import { deshacerMovimientoInventario, leerErrorInventario, moverInventario, movimientosDeInventario, type MovInventario } from '@/negocio/inventarioDatos';
import { ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

const MOTIVOS_ENTRADA = ['compraProveedor', 'produccion', 'devolucionCliente', 'ajusteConteo'] as const;
const MOTIVOS_SALIDA = ['merma', 'regalo', 'usoInterno', 'ajusteConteo'] as const;
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Entrada y salida de mercancía (spec 04, §5; reglas C2 y C3). */
export default function Mercancia() {
  const { t } = useTranslation();
  const textosFecha = useTextosFecha();
  const { colores, oscuro } = useTema();
  const ejemplo = useModoEjemplo();
  const params = useLocalSearchParams<{ producto?: string; variante?: string }>();
  const { negocio, bodegas, productos, stock, actualizar, version } = useNegocio();
  const principal = bodegas.find((b) => b.principal)?.id ?? bodegas[0]?.id ?? null;

  const [productoId, setProductoId] = useState<string | null>(params.producto ?? null);
  const [varianteId, setVarianteId] = useState<string | null>(params.variante ?? null);
  const [bodega, setBodega] = useState<string | null>(principal);
  const [entra, setEntra] = useState(true);
  const [motivo, setMotivo] = useState<string>('compraProveedor');
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [escaneando, setEscaneando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'error' | 'info' } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ultimos, setUltimos] = useState<MovInventario[]>([]);

  const producto = productos.find((p) => p.id === productoId) ?? null;
  const variante = producto?.variantes.find((v) => v.id === varianteId) ?? (producto?.variantes.length === 1 ? producto.variantes[0] : null);
  const hay = variante && bodega ? stockDeVariante(variante.id, stock, bodega) : 0;
  const quedarian = hay + (entra ? cantidad : -cantidad);
  const nombreBodega = new Map(bodegas.map((b) => [b.id, b.nombre]));
  const nombreVariante = new Map(productos.flatMap((p) => p.variantes.map((v) => [v.id, p.variantes.length > 1 ? `${p.nombre} · ${v.nombre}` : p.nombre] as const)));

  const cargarUltimos = useCallback(async () => {
    if (!negocio || ejemplo) return setUltimos([]);
    setUltimos((await movimientosDeInventario(negocio.id, undefined, 15)).filter((m) => m.tipo !== 'traslado'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` solo sirve para volver a leer
  }, [negocio, ejemplo, version]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor
    cargarUltimos();
  }, [cargarUltimos]);

  function elegir(pId: string, vId: string | null) {
    setProductoId(pId);
    setVarianteId(vId);
    setBusqueda('');
    setMensaje(null);
  }

  function alEscanear(codigo: string) {
    setEscaneando(false);
    const p = productos.find((x) => x.variantes.some((v) => v.codigo === codigo));
    if (!p) return setMensaje({ texto: t('inventario.escaner.noEncontrado', { codigo }), tipo: 'error' });
    elegir(p.id, p.variantes.find((v) => v.codigo === codigo)?.id ?? null);
  }

  async function registrar() {
    if (!variante || !bodega) return;
    if (!entra) {
      const v = validarSalida(cantidad, hay);
      if (v?.codigo === 'stockInsuficiente') return setMensaje({ texto: t('inventario.errores.stockInsuficiente', { disponible: hay, bodega: nombreBodega.get(bodega) }), tipo: 'error' });
      if (v) return setMensaje({ texto: t('inventario.errores.cantidadInvalida'), tipo: 'error' });
    } else if (cantidad <= 0) return setMensaje({ texto: t('inventario.errores.cantidadInvalida'), tipo: 'error' });
    setGuardando(true);
    const { error } = await moverInventario(variante.id, bodega, entra ? cantidad : -cantidad, motivo, nota);
    setGuardando(false);
    const err = leerErrorInventario(error);
    if (err) {
      return setMensaje({
        texto: err.codigo === 'stockInsuficiente' ? t('inventario.errores.stockInsuficiente', err.detalle) : t('inventario.errores.general'),
        tipo: 'error',
      });
    }
    setMensaje({ texto: t('inventario.mercancia.guardado'), tipo: 'info' });
    setCantidad(1);
    setNota('');
    actualizar();
  }

  async function deshacer(id: string) {
    const { error } = await deshacerMovimientoInventario(id);
    const err = leerErrorInventario(error);
    if (err) {
      return setMensaje({ texto: ['stockInsuficiente', 'noSeDeshace'].includes(err.codigo) ? t(`inventario.errores.${err.codigo}` as 'inventario.errores.general', err.detalle) : t('inventario.errores.general'), tipo: 'error' });
    }
    actualizar();
  }

  const texto = sinTildes(busqueda.trim());
  const encontrados = texto ? productos.filter((p) => sinTildes(p.nombre).includes(texto) || p.variantes.some((v) => v.codigo?.includes(texto))).slice(0, 12) : productos.slice(0, 12);
  // "15 nov", en la hora de Colombia, igual que en el resto de la app.
  const fecha = (iso: string) => fechaCorta(hoyEn(new Date(iso)), textosFecha);
  const motivos = entra ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA;

  return (
    <PantallaAjuste titulo={t('inventario.mercancia.titulo')} detalle={t('inventario.mercancia.detalle')}>
      {productos.length === 0 && <Texto variante="suave">{t('inventario.mercancia.sinProductos')}</Texto>}

      {!producto && productos.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', gap: ESPACIO.s, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <CampoTexto
                etiqueta=""
                accessibilityLabel={t('inventario.mercancia.buscar')}
                placeholder={t('inventario.mercancia.buscar')}
                value={busqueda}
                autoCorrect={false}
                autoCapitalize="none"
                onChangeText={(v) => {
                  // Pistola lectora o código escrito completo: escoge el producto y la variante de una.
                  const codigo = v.trim();
                  const p = codigo.length >= 6 ? productos.find((x) => x.variantes.some((y) => y.codigo === codigo)) : undefined;
                  if (p) return elegir(p.id, p.variantes.find((y) => y.codigo === codigo)?.id ?? null);
                  setBusqueda(v);
                }}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('inventario.escaner.escanear')}
              onPress={() => setEscaneando(true)}
              style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.seleccionado, opacity: pressed ? 0.7 : 1 })}>
              <Icono nombre="codigoBarras" tamano={28} color={colores.enlace} />
            </Pressable>
          </View>
          {encontrados.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => elegir(p.id, null)}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 64, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.98 : 1 }] },
                sombraSuave(oscuro),
              ]}>
              <MiniaturaProducto url={p.fotoUrl} emoji={p.emoji} tamano={40} />
              <Texto variante="fuerte" style={{ flex: 1 }} numberOfLines={1}>
                {p.nombre}
              </Texto>
            </Pressable>
          ))}
        </>
      )}

      {producto && (
        <>
          <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, padding: ESPACIO.m }}>
            <MiniaturaProducto url={producto.fotoUrl} emoji={producto.emoji} />
            <Texto variante="fuerte" style={{ flex: 1 }} numberOfLines={2}>
              {producto.nombre}
            </Texto>
            <Boton titulo={t('inventario.mercancia.cambiar')} variante="texto" onPress={() => setProductoId(null)} />
          </Tarjeta>

          {producto.variantes.length > 1 && (
            <>
              <Texto variante="fuerte">{t('inventario.mercancia.variante')}</Texto>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
                {producto.variantes.map((v) => (
                  <Chip key={v.id} texto={`${v.nombre} · ${bodega ? stockDeVariante(v.id, stock, bodega) : 0}`} elegido={variante?.id === v.id} onPress={() => setVarianteId(v.id)} />
                ))}
              </View>
            </>
          )}

          {bodegas.length > 1 && (
            <>
              <Texto variante="fuerte">{t('inventario.mercancia.bodega')}</Texto>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }} contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}>
                {bodegas.map((b) => (
                  <Chip key={b.id} texto={b.nombre} elegido={bodega === b.id} onPress={() => setBodega(b.id)} />
                ))}
              </ScrollView>
            </>
          )}

          <View style={{ flexDirection: 'row', gap: ESPACIO.s }} accessibilityRole="radiogroup">
            <Chip
              texto={t('inventario.mercancia.entra')}
              elegido={entra}
              onPress={() => {
                setEntra(true);
                setMotivo('compraProveedor');
              }}
            />
            <Chip
              texto={t('inventario.mercancia.sale')}
              elegido={!entra}
              onPress={() => {
                setEntra(false);
                setMotivo('merma');
              }}
            />
          </View>

          <Texto variante="fuerte">{t('inventario.mercancia.motivo')}</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
            {motivos.map((m) => (
              <Chip key={m} texto={t(`inventario.motivos.${m}`)} elegido={motivo === m} onPress={() => setMotivo(m)} />
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
            <Texto variante="fuerte" style={{ flex: 1 }}>
              {t('inventario.mercancia.cantidad')}
            </Texto>
            <CampoCantidad etiqueta={t('inventario.mercancia.cantidad')} valor={cantidad} onCambio={setCantidad} />
          </View>
          {variante && bodega && (
            <Texto variante="medio" color={quedarian < 0 ? colores.errorTexto : colores.textoSuave}>
              {t('inventario.mercancia.hoyHay', { hay, bodega: nombreBodega.get(bodega), quedarian })}
            </Texto>
          )}
          <CampoTexto etiqueta="" accessibilityLabel={t('inventario.mercancia.nota')} placeholder={t('inventario.mercancia.nota')} value={nota} onChangeText={setNota} maxLength={120} />
          {mensaje && <Aviso mensaje={mensaje.texto} tipo={mensaje.tipo} />}
          <Boton titulo={t('inventario.mercancia.guardar')} onPress={registrar} cargando={guardando} disabled={!variante || !bodega} />
        </>
      )}
      {!producto && mensaje && <Aviso mensaje={mensaje.texto} tipo={mensaje.tipo} />}

      <Texto variante="pequeno">{t('inventario.mercancia.traslados')}</Texto>

      {ultimos.length > 0 && (
        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="subtitulo">{t('inventario.mercancia.ultimos')}</Texto>
          <View style={[{ backgroundColor: colores.tarjeta, borderRadius: 20, paddingHorizontal: ESPACIO.m, paddingVertical: ESPACIO.xs }, sombraSuave(oscuro)]}>
            {ultimos.map((m, i) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: colores.borde }}>
                <View style={{ flex: 1, paddingVertical: ESPACIO.xs }}>
                  <Texto variante="medio" numberOfLines={1}>
                    {nombreVariante.get(m.variante) ?? ''}
                  </Texto>
                  <Texto variante="pequeno" numberOfLines={1}>
                    {[fecha(m.fecha), m.motivo ? t(`inventario.motivos.${m.motivo}` as 'inventario.motivos.ajusteConteo') : t(`inventario.tipos.${m.tipo}` as 'inventario.tipos.entrada'), m.bodega ? nombreBodega.get(m.bodega) : null, m.deshecho ? t('inventario.tipos.deshacer') : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Texto>
                </View>
                <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22, textDecorationLine: m.deshecho ? 'line-through' : 'none' }} color={m.cantidad > 0 ? colores.ingresoTexto : colores.texto}>
                  {m.cantidad > 0 ? `+${m.cantidad}` : `−${-m.cantidad}`}
                </Texto>
                {!m.deshecho && ['entrada', 'salida', 'inicial'].includes(m.tipo) && (
                  <Pressable accessibilityRole="button" onPress={() => deshacer(m.id)} hitSlop={6} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: ESPACIO.xs }}>
                    <Texto variante="pequeno" color={colores.enlace} style={{ fontFamily: FUENTES.textoFuerte }}>
                      {t('inventario.mercancia.deshacer')}
                    </Texto>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <Escaner abierto={escaneando} onCodigo={alEscanear} onCerrar={() => setEscaneando(false)} />
    </PantallaAjuste>
  );
}
