import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Emoji } from '@/components/emoji/Emoji';
import { Icono } from '@/components/Icono';
import { Texto } from '@/components/Texto';
import { Escaner } from '@/inventario/Escaner';
import { MiniaturaProducto } from '@/inventario/Foto';
import { stockDeVariante } from '@/lib/inventario';
import { cabeEnCarrito, totalesVenta } from '@/lib/pos';
import { useNegocio } from '@/negocio/contexto';
import { useTributario } from '@/impuestos/ganchos';
import type { Producto } from '@/negocio/inventarioDatos';
import { usePlata } from '@/personal/ganchos';
import { usePos } from '@/pos/contexto';
import { BannerPendientes } from '@/pos/BannerPendientes';
import { PantallaPos } from '@/pos/PantallaPos';
import { ALTO_TOCABLE, ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Sirumi POS · Catálogo (spec 05, §1): bodega de venta, buscador, colecciones, productos con su disponible (D2) y carrito. */
export default function Catalogo() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const { negocio, bodegas, productos, stock } = useNegocio();
  const tributario = useTributario();
  const pos = usePos();
  // El vendedor vende desde su bodega asignada (no la puede cambiar).
  const bodegaFija = negocio?.rol === 'seller' ? negocio.bodegaAsignada : null;
  const bodega = bodegaFija ?? pos.bodega ?? bodegas.find((b) => b.principal)?.id ?? bodegas[0]?.id ?? null;
  const [busqueda, setBusqueda] = useState('');
  const [coleccion, setColeccion] = useState<string | null>(null);
  const [elegirDe, setElegirDe] = useState<Producto | null>(null);
  const [libre, setLibre] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mensajeEscaner, setMensajeEscaner] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);

  const nombreBodega = bodegas.find((b) => b.id === bodega)?.nombre ?? '';
  const disponible = (variante: string) => (bodega ? stockDeVariante(variante, stock, bodega) : 0);
  const unidades = pos.lineas.reduce((s, l) => s + l.cantidad, 0);
  const { total } = totalesVenta(pos.lineas, pos.descuento, negocio?.configuracion.responsable_iva && tributario.tasaVentas > 0 ? { tarifa: tributario.tasaVentas, incluido: pos.ivaIncluido } : null);
  const colecciones = [...new Set(productos.map((p) => p.coleccion).filter((c): c is string => !!c))];
  const texto = sinTildes(busqueda.trim());
  const lista = productos.filter(
    (p) => (!coleccion || p.coleccion === coleccion) && (!texto || sinTildes(p.nombre).includes(texto) || p.variantes.some((v) => v.codigo?.includes(texto))),
  );

  /** Agrega una unidad; devuelve el mensaje de lo que pasó (para el escáner y la pistola lectora). */
  function agregarVariante(p: Producto, varianteId: string): { texto: string; tipo: 'ok' | 'error' } | null {
    const v = p.variantes.find((x) => x.id === varianteId);
    if (!v) return null;
    const nombre = p.variantes.length > 1 ? `${p.nombre} · ${v.nombre}` : p.nombre;
    if (!cabeEnCarrito(v.id, disponible(v.id), pos.lineas)) {
      const texto = t('pos.noHayMas', { nombre, bodega: nombreBodega });
      setAviso(texto);
      return { texto, tipo: 'error' };
    }
    setAviso(null);
    pos.agregar({ variante: v.id, nombre, precio: p.precio, costo: p.costo });
    return { texto: t('inventario.escaner.agregado', { nombre }), tipo: 'ok' };
  }

  /** Busca un código exacto (cámara, pistola lectora o escrito) y lo suma al carrito. */
  function venderPorCodigo(codigo: string) {
    const p = productos.find((x) => x.variantes.some((v) => v.codigo === codigo));
    const v = p?.variantes.find((x) => x.codigo === codigo);
    if (!p || !v) return { texto: t('inventario.escaner.noEncontrado', { codigo }), tipo: 'error' as const };
    return agregarVariante(p, v.id);
  }

  /** La pistola lectora "escribe" el código en el buscador: si es un código exacto, se vende de una. */
  function cambiarBusqueda(valor: string) {
    const codigo = valor.trim();
    if (codigo.length >= 6 && /^[0-9A-Za-z-]+$/.test(codigo) && productos.some((x) => x.variantes.some((v) => v.codigo === codigo))) {
      const r = venderPorCodigo(codigo);
      setBusqueda('');
      if (r) setAviso(r.texto);
      return;
    }
    setBusqueda(valor);
  }

  function tocarProducto(p: Producto) {
    if (p.variantes.length === 1) return agregarVariante(p, p.variantes[0].id);
    setElegirDe(p);
  }

  function cambiarBodega(id: string) {
    if (id === bodega) return;
    // Cambiar de bodega vacía el carrito (spec 05, §1).
    if (!pos.lineas.length) return pos.cambiar({ bodega: id });
    Alert.alert(t('pos.bodega'), t('pos.cambiarBodega'), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      { text: t('pos.cambiar'), onPress: () => pos.cambiar({ bodega: id, lineas: [] }) },
    ]);
  }

  function alEscanear(codigo: string) {
    setMensajeEscaner(venderPorCodigo(codigo));
  }

  return (
    <PantallaPos
      titulo={t('pos.vender')}
      derecha={
        <View style={{ flexDirection: 'row', gap: ESPACIO.s }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('inventario.escaner.escanear')}
            onPress={() => setEscaneando(true)}
            style={[{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.tarjeta }, sombraSuave(oscuro)]}>
            <Icono nombre="codigoBarras" tamano={24} color={colores.enlace} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/pos/ventas')}
            style={[{ minHeight: ALTO_TOCABLE, paddingHorizontal: ESPACIO.m, borderRadius: 999, justifyContent: 'center', backgroundColor: colores.tarjeta }, sombraSuave(oscuro)]}>
            <Texto variante="fuerte" color={colores.enlace}>
              {t('pos.ventas')}
            </Texto>
          </Pressable>
        </View>
      }
      pie={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, paddingLeft: ESPACIO.s }}>
          <View style={{ flex: 1 }}>
            <Texto variante="pequeno">{t('pos.articulos', { count: unidades })}</Texto>
            <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 20, lineHeight: 26 }}>{plata(total)}</Texto>
          </View>
          <Boton titulo={`${t('pos.irACobrar')} →`} disabled={!pos.lineas.length} onPress={() => router.push('/pos/cobrar')} style={{ paddingHorizontal: ESPACIO.l }} />
        </View>
      }>
      <BannerPendientes />
      {bodegas.length > 1 && !bodegaFija && (
        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="fuerte">{t('pos.bodega')}</Texto>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }} contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}>
            {bodegas.map((b) => (
              <Chip key={b.id} texto={b.nombre} elegido={bodega === b.id} onPress={() => cambiarBodega(b.id)} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Accesos rápidos */}
      <View style={{ flexDirection: 'row', gap: ESPACIO.s }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setLibre(true)}
          style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, opacity: pressed ? 0.8 : 1 }, sombraSuave(oscuro)]}>
          <Emoji name="lapiz" size={26} />
          <View style={{ flex: 1 }}>
            <Texto variante="fuerte">{t('pos.ventaLibre')}</Texto>
            <Texto variante="pequeno" numberOfLines={1}>
              {t('pos.ventaLibreDetalle')}
            </Texto>
          </View>
        </Pressable>
      </View>

      {productos.length === 0 ? (
        <View style={{ alignItems: 'center', gap: ESPACIO.s, paddingVertical: ESPACIO.m }}>
          <Emoji name="paquete" size={56} />
          <Texto variante="suave" style={{ textAlign: 'center' }}>
            {t('pos.sinProductos')}
          </Texto>
          <Boton titulo={t('pos.cargarProductos')} variante="secundario" onPress={() => router.push('/inventario')} />
        </View>
      ) : (
        <>
          <CampoTexto
            etiqueta=""
            accessibilityLabel={t('pos.buscar')}
            placeholder={t('pos.buscar')}
            value={busqueda}
            onChangeText={cambiarBusqueda}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => {
              const codigo = busqueda.trim();
              if (!codigo || !productos.some((x) => x.variantes.some((v) => v.codigo === codigo))) return;
              const r = venderPorCodigo(codigo);
              setBusqueda('');
              if (r) setAviso(r.texto);
            }}
          />
          {colecciones.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }} contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}>
              <Chip texto={t('pos.todas')} elegido={coleccion === null} onPress={() => setColeccion(null)} />
              {colecciones.map((c) => (
                <Chip key={c} texto={c} elegido={coleccion === c} onPress={() => setColeccion(c)} />
              ))}
            </ScrollView>
          )}
        </>
      )}

      {aviso && (
        <View accessibilityRole="alert" style={{ padding: ESPACIO.m, borderRadius: 16, backgroundColor: colores.avisoFondo }}>
          <Texto variante="pequeno" color={colores.avisoTexto}>
            {aviso}
          </Texto>
        </View>
      )}

      {/* Tarjetas de producto, dos por fila */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s + 4 }}>
        {lista.map((p) => {
          const disp = p.variantes.reduce((s, v) => s + disponible(v.id), 0);
          const enCarrito = pos.lineas.filter((l) => p.variantes.some((v) => v.id === l.variante)).reduce((s, l) => s + l.cantidad, 0);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.nombre}, ${plata(p.precio)}, ${disp > 0 ? t('pos.disponibles', { n: disp }) : t('pos.agotado')}`}
              disabled={disp === 0}
              onPress={() => tocarProducto(p)}
              style={({ pressed }) => [
                {
                  width: '48%',
                  flexGrow: 1,
                  gap: ESPACIO.xs,
                  padding: ESPACIO.m,
                  borderRadius: 20,
                  backgroundColor: colores.tarjeta,
                  borderWidth: 2,
                  borderColor: enCarrito ? colores.accion : 'transparent',
                  opacity: disp === 0 ? 0.5 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
                sombraSuave(oscuro),
              ]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <MiniaturaProducto url={p.fotoUrl} emoji={p.emoji} tamano={52} />
                {enCarrito > 0 && (
                  <View style={{ minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.accion }}>
                    <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 14, lineHeight: 18 }} color={colores.textoSobreAccion}>
                      {enCarrito}
                    </Texto>
                  </View>
                )}
              </View>
              <Texto variante="fuerte" numberOfLines={2}>
                {p.nombre}
              </Texto>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }}>{plata(p.precio)}</Texto>
              <Texto variante="pequeno" color={disp === 0 ? colores.errorTexto : undefined}>
                {disp > 0 ? t('pos.disponibles', { n: disp }) : t('pos.agotado')}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      {/* Elegir talla o color */}
      <Modal visible={!!elegirDe} transparent animationType="fade" onRequestClose={() => setElegirDe(null)}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('comun.cerrar')} onPress={() => setElegirDe(null)} style={{ flex: 1, backgroundColor: 'rgba(10,20,50,0.45)', justifyContent: 'flex-end' }}>
          <Pressable style={{ backgroundColor: colores.fondo, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: ESPACIO.l, gap: ESPACIO.m }}>
            <SafeAreaView edges={['bottom']} style={{ gap: ESPACIO.m }}>
              <Texto variante="subtitulo">{elegirDe?.nombre}</Texto>
              <Texto variante="suave">{t('pos.eligeVariante')}</Texto>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
                {elegirDe?.variantes.map((v) => {
                  const d = disponible(v.id);
                  return (
                    <Pressable
                      key={v.id}
                      accessibilityRole="button"
                      disabled={d === 0}
                      onPress={() => {
                        agregarVariante(elegirDe, v.id);
                        setElegirDe(null);
                      }}
                      style={{ minHeight: ALTO_TOCABLE + 12, minWidth: 96, paddingHorizontal: ESPACIO.m, borderRadius: 16, justifyContent: 'center', backgroundColor: colores.tarjeta, opacity: d === 0 ? 0.45 : 1 }}>
                      <Texto variante="fuerte">{v.nombre}</Texto>
                      <Texto variante="pequeno" color={d === 0 ? colores.errorTexto : undefined}>
                        {d > 0 ? t('pos.disponibles', { n: d }) : t('pos.agotado')}
                      </Texto>
                    </Pressable>
                  );
                })}
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      <VentaLibre
        abierta={libre}
        onCerrar={() => setLibre(false)}
        onAgregar={(nombre, precio) => {
          pos.agregar({ variante: null, nombre, precio, costo: null });
          setLibre(false);
        }}
      />
      <Escaner
        abierto={escaneando}
        continuo
        mensaje={mensajeEscaner}
        onCodigo={alEscanear}
        onCerrar={() => {
          setEscaneando(false);
          setMensajeEscaner(null);
        }}
      />
    </PantallaPos>
  );
}

/** Venta libre: algo que no está en el catálogo (no mueve stock; su costo sale del % del negocio). */
function VentaLibre({ abierta, onCerrar, onAgregar }: { abierta: boolean; onCerrar: () => void; onAgregar: (nombre: string, precio: number) => void }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(0);
  return (
    <Modal visible={abierta} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        <View style={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('comun.cerrar')}
              onPress={onCerrar}
              style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.relleno }}>
              <Icono nombre="cerrar" tamano={18} />
            </Pressable>
            <Texto variante="subtitulo">{t('pos.ventaLibre')}</Texto>
          </View>
          <CampoTexto etiqueta={t('pos.concepto')} placeholder={t('pos.ejemploConcepto')} value={nombre} onChangeText={setNombre} maxLength={60} />
          <CampoDinero etiqueta={t('pos.monto')} valor={precio} onCambio={setPrecio} />
          <Boton
            titulo={t('pos.agregar')}
            disabled={!precio}
            onPress={() => {
              onAgregar(nombre.trim() || t('pos.ventaLibre'), precio);
              setNombre('');
              setPrecio(0);
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
