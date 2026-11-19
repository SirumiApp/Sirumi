import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { hoyEn } from '@/lib/fechas';
import { fechaCorta } from '@/personal/etiquetas';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { codigoInterno, porReponer, stockDeVariante, stockDeProducto } from '@/lib/inventario';
import { puntoDeEquilibrio, unidadesDeEquilibrio } from '@/lib/negocio';
import { useNegocio } from '@/negocio/contexto';
import {
  actualizarProducto,
  agregarVariante,
  borrarProducto,
  cambiarCodigo,
  deshacerMovimientoInventario,
  leerErrorInventario,
  moverInventario,
  movimientosDeInventario,
  quitarVariante,
  type DesgloseCosto,
  type MovInventario,
  type Producto,
} from '@/negocio/inventarioDatos';
import { quitarFotoProducto, subirFotoProducto } from '@/negocio/fotos';
import { FilaCifra, ListaFilas } from '@/negocio/Piezas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { ESPACIO, FUENTES, useTema } from '@/theme';

import { EditorFoto } from './Foto';
import { HojaTrasladoInventario } from './HojaTrasladoInventario';
import { CampoCosto, LineaMargen } from './NuevoProducto';
import { Escaner } from './Escaner';
import { CampoCantidad, CampoCodigo, SelectorEmoji } from './Piezas';

/** Detalle del producto (spec 04, §4): margen (C1), stock por bodega (C2), códigos (C6), variantes e historial. */
export function DetalleProducto({ producto }: { producto: Producto }) {
  const { t } = useTranslation();
  const textosFecha = useTextosFecha();
  const { colores } = useTema();
  const plata = usePlata();
  const ejemplo = useModoEjemplo();
  const { negocio, bodegas, stock, productos, actualizar, version } = useNegocio();
  const [bodega, setBodega] = useState<string | null>(bodegas.find((b) => b.principal)?.id ?? bodegas[0]?.id ?? null);
  const [editando, setEditando] = useState(false);
  const [moviendo, setMoviendo] = useState(false);
  // Variante a la que se le está escaneando el código.
  const [escaneando, setEscaneando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [historial, setHistorial] = useState<MovInventario[]>([]);
  const [nuevaVariante, setNuevaVariante] = useState('');
  const ids = producto.variantes.map((v) => v.id);
  const claveIds = ids.join();
  const nombreBodega = new Map(bodegas.map((b) => [b.id, b.nombre]));
  const nombreVar = new Map(producto.variantes.map((v) => [v.id, v.nombre]));

  const cargarHistorial = useCallback(async () => {
    if (!negocio || ejemplo || !claveIds) return setHistorial([]);
    setHistorial(await movimientosDeInventario(negocio.id, claveIds.split(','), 20));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` solo sirve para volver a leer
  }, [negocio, ejemplo, version, claveIds]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor
    cargarHistorial();
  }, [cargarHistorial]);

  /** Muestra el error de una función de inventario en palabras. */
  function mostrarError(e: { message?: string; details?: string | null } | null) {
    const err = leerErrorInventario(e);
    if (!err) return false;
    const conocidos = ['stockInsuficiente', 'codigoDeOtro', 'varianteConStock', 'noSeDeshace', 'cantidadInvalida'];
    setError(conocidos.includes(err.codigo) ? t(`inventario.errores.${err.codigo}` as 'inventario.errores.general', err.detalle) : t('inventario.errores.general'));
    return true;
  }

  async function ajustar(variante: string, delta: number) {
    if (!bodega) return;
    setError(null);
    setOcupado(true);
    const { error: e } = await moverInventario(variante, bodega, delta, 'ajusteConteo');
    setOcupado(false);
    if (!mostrarError(e)) actualizar();
  }

  async function generarCodigo(variante: string) {
    await guardarCodigo(variante, codigoInterno());
  }

  /** C6 · El código no se repite en el negocio: se avisa con qué producto choca antes de guardar. */
  async function guardarCodigo(variante: string, codigo: string | null) {
    setError(null);
    if (codigo) {
      const otro = productos.find((p) => p.variantes.some((x) => x.codigo === codigo && x.id !== variante));
      if (otro) return setError(t('inventario.errores.codigoDeOtro', { codigo, producto: otro.nombre }));
    }
    const { error: e } = await cambiarCodigo(variante, codigo);
    if (e) return setError(t('inventario.errores.general'));
    actualizar();
  }

  function preguntarQuitarVariante(variante: string) {
    Alert.alert(t('inventario.detalleProducto.quitarVariante'), nombreVar.get(variante) ?? '', [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      {
        text: t('inventario.detalleProducto.quitarVariante'),
        style: 'destructive',
        onPress: async () => {
          const { error: e } = await quitarVariante(variante);
          if (!mostrarError(e)) actualizar();
        },
      },
    ]);
  }

  async function sumarVariante() {
    const nombre = nuevaVariante.trim();
    if (!nombre || !negocio) return;
    const { error: e } = await agregarVariante(negocio.id, producto.id, { color: nombre, talla: null, codigo: null, posicion: producto.variantes.length });
    if (!mostrarError(e)) {
      setNuevaVariante('');
      actualizar();
    }
  }

  async function deshacer(id: string) {
    const { error: e } = await deshacerMovimientoInventario(id);
    if (!mostrarError(e)) actualizar();
  }

  function preguntarBorrar() {
    Alert.alert(t('inventario.detalleProducto.borrar'), t('inventario.detalleProducto.confirmarBorrar'), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      {
        text: t('inventario.detalleProducto.siBorrar'),
        style: 'destructive',
        onPress: async () => {
          const { error: e } = await borrarProducto(producto.id);
          if (mostrarError(e)) return;
          actualizar();
          router.back();
        },
      },
    ]);
  }

  // B8 · Unidades de este producto para cubrir los gastos fijos del mes.
  const cfg = negocio?.configuracion;
  const equilibrio = cfg?.fijos_mes ? puntoDeEquilibrio({ fijosMes: cfg.fijos_mes, costoPorcentaje: producto.precio ? (producto.costo / producto.precio) * 100 : 0, variables: 0, ventas: 0 }).ventasEquilibrio : null;
  const total = stockDeProducto(ids, stock);
  const bajo = porReponer({ ...producto, variantes: ids }, stock);
  // "15 nov", en la hora de Colombia, igual que en el resto de la app.
  const fecha = (iso: string) => fechaCorta(hoyEn(new Date(iso)), textosFecha);

  if (editando) return <EditarProducto producto={producto} onListo={() => setEditando(false)} />;

  return (
    <PantallaAjuste titulo={producto.nombre}>
      <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
        <EditorFoto
          url={producto.fotoUrl}
          emoji={producto.emoji}
          onElegida={async (uri) => {
            if (!negocio) return;
            const r = await subirFotoProducto(negocio.id, producto.id, uri);
            if (r.error) return setError(t('inventario.foto.error'));
            actualizar();
          }}
          onQuitar={async () => {
            if (!producto.foto) return;
            const r = await quitarFotoProducto(producto.id, producto.foto);
            if (r.error) return setError(t('inventario.foto.error'));
            actualizar();
          }}
        />
        <View style={{ flex: 1, gap: 2 }}>
          {producto.coleccion ? <Texto variante="etiqueta">{producto.coleccion}</Texto> : null}
          <Texto variante="cifra">{plata(producto.precio)}</Texto>
          <Texto variante="pequeno">
            {t('inventario.producto.costo')}: {plata(producto.costo)}
          </Texto>
        </View>
      </Tarjeta>
      <LineaMargen precio={producto.precio} costo={producto.costo} />
      {producto.desglose && (
        <Texto variante="pequeno">
          {(['materia', 'manoDeObra', 'empaque', 'otros'] as const)
            .filter((k) => producto.desglose![k] > 0)
            .map((k) => `${t(`inventario.producto.${k}`)} ${plata(producto.desglose![k])}`)
            .join(' · ')}
        </Texto>
      )}
      {equilibrio !== null && equilibrio > 0 && <Texto variante="pequeno">{t('inventario.detalleProducto.equilibrio', { unidades: unidadesDeEquilibrio(equilibrio, producto.precio) })}</Texto>}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <Texto variante="subtitulo" style={{ flex: 1 }}>
          {t('inventario.detalleProducto.total', { total: t('inventario.unidades', { count: total }) })}
        </Texto>
        {bajo && (
          <Texto variante="pequeno" color={colores.avisoTexto} style={{ fontFamily: FUENTES.textoFuerte }}>
            {t('inventario.reponer')}
          </Texto>
        )}
      </View>

      {bodegas.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }} contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}>
          {bodegas.map((b) => (
            <Chip key={b.id} texto={b.nombre} elegido={bodega === b.id} onPress={() => setBodega(b.id)} />
          ))}
        </ScrollView>
      )}
      <Texto variante="pequeno">{t('inventario.detalleProducto.ajuste')}</Texto>

      {producto.variantes.map((v) => {
        const enBodega = bodega ? stockDeVariante(v.id, stock, bodega) : 0;
        const totalV = stockDeVariante(v.id, stock);
        const reparto = bodegas
          .map((b) => ({ n: b.nombre, u: stockDeVariante(v.id, stock, b.id) }))
          .filter((x) => x.u > 0)
          .map((x) => `${x.n} ${x.u}`)
          .join(' · ');
        return (
          <Tarjeta key={v.id} style={{ gap: ESPACIO.s, padding: ESPACIO.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
              <View style={{ flex: 1 }}>
                <Texto variante="fuerte">{v.nombre}</Texto>
                <Texto variante="pequeno">{`${t('inventario.detalleProducto.total', { total: totalV })}${reparto && bodegas.length > 1 ? ` · ${reparto}` : ''}`}</Texto>
              </View>
              <CampoCantidad
                etiqueta={v.nombre}
                valor={enBodega}
                deshabilitado={ocupado || !bodega}
                soloBotones
                onCambio={(nuevo) => nuevo !== enBodega && ajustar(v.id, nuevo - enBodega)}
              />
            </View>
            <CampoCodigo
              key={`${v.id}-${v.codigo ?? ''}`}
              valor={v.codigo}
              etiqueta={v.nombre}
              onGuardar={(c) => guardarCodigo(v.id, c)}
              onEscanear={() => setEscaneando(v.id)}
              onGenerar={() => generarCodigo(v.id)}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              {totalV === 0 && producto.variantes.length > 1 && <Boton titulo={t('inventario.detalleProducto.quitarVariante')} variante="texto" onPress={() => preguntarQuitarVariante(v.id)} />}
            </View>
          </Tarjeta>
        );
      })}

      <View style={{ flexDirection: 'row', gap: ESPACIO.s, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <CampoTexto etiqueta="" accessibilityLabel={t('inventario.detalleProducto.nuevaVariante')} placeholder={t('inventario.detalleProducto.nuevaVariante')} value={nuevaVariante} onChangeText={setNuevaVariante} maxLength={30} />
        </View>
        <Boton titulo={t('inventario.producto.agregar')} variante="secundario" onPress={sumarVariante} />
      </View>

      {error && <Aviso mensaje={error} />}

      {historial.length > 0 && (
        <ListaFilas titulo={t('inventario.movimientos')}>
          {historial.map((m) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
              <View style={{ flex: 1 }}>
                <FilaCifra
                  titulo={`${m.motivo ? t(`inventario.motivos.${m.motivo}` as 'inventario.motivos.ajusteConteo') : t(`inventario.tipos.${m.tipo}` as 'inventario.tipos.entrada')} · ${nombreVar.get(m.variante) ?? ''}`}
                  ayuda={[fecha(m.fecha), m.bodega ? nombreBodega.get(m.bodega) : null, m.deshecho ? t('inventario.tipos.deshacer') : null].filter(Boolean).join(' · ')}
                  valor={m.cantidad > 0 ? `+${m.cantidad}` : `−${-m.cantidad}`}
                  color={m.cantidad > 0 ? colores.ingresoTexto : undefined}
                />
              </View>
              {!m.deshecho && ['entrada', 'salida', 'inicial'].includes(m.tipo) && (
                <Pressable accessibilityRole="button" onPress={() => deshacer(m.id)} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Texto variante="pequeno" color={colores.enlace} style={{ fontFamily: FUENTES.textoFuerte }}>
                    ↺
                  </Texto>
                </Pressable>
              )}
            </View>
          ))}
        </ListaFilas>
      )}

      <Boton
        titulo={t('inventario.mercancia.boton')}
        variante="secundario"
        onPress={() => router.push({ pathname: '/inventario/mercancia', params: { producto: producto.id } })}
      />
      <Boton
        titulo={t('inventario.traslado.boton')}
        variante="secundario"
        onPress={() => (ejemplo ? avisarEjemplo() : bodegas.length < 2 ? setError(t('inventario.traslado.necesitaDos')) : setMoviendo(true))}
      />
      <Boton titulo={t('inventario.detalleProducto.editar')} variante="secundario" onPress={() => setEditando(true)} />
      <Escaner
        abierto={escaneando !== null}
        onCerrar={() => setEscaneando(null)}
        onCodigo={(codigo) => {
          const v = escaneando;
          setEscaneando(null);
          if (v) guardarCodigo(v, codigo);
        }}
      />
      <HojaTrasladoInventario
        abierta={moviendo}
        producto={producto}
        bodegas={bodegas}
        stock={stock}
        onCerrar={() => setMoviendo(false)}
        onListo={() => {
          setMoviendo(false);
          actualizar();
        }}
      />
      <Boton titulo={t('inventario.detalleProducto.borrar')} variante="texto" onPress={preguntarBorrar} />
    </PantallaAjuste>
  );
}

/** Editar nombre, ícono, colección, precio, costos (C1) y mínimo. */
function EditarProducto({ producto, onListo }: { producto: Producto; onListo: () => void }) {
  const { t } = useTranslation();
  const { actualizar } = useNegocio();
  const [emoji, setEmoji] = useState(producto.emoji);
  const [nombre, setNombre] = useState(producto.nombre);
  const [coleccion, setColeccion] = useState(producto.coleccion ?? '');
  const [precio, setPrecio] = useState(producto.precio);
  const [costo, setCosto] = useState(producto.costo);
  const [desglose, setDesglose] = useState<DesgloseCosto | null>(producto.desglose);
  const [minimo, setMinimo] = useState(String(producto.minimo || ''));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return setError(t('errores.productoSinNombre'));
    if (!precio) return setError(t('errores.productoSinPrecio'));
    setGuardando(true);
    const { error: e } = await actualizarProducto(producto.id, { nombre, coleccion, emoji, precio, costo, desglose, minimo: parseInt(minimo || '0', 10) });
    setGuardando(false);
    if (e) return setError(t('inventario.errores.general'));
    actualizar();
    onListo();
  }

  return (
    <PantallaAjuste titulo={t('inventario.detalleProducto.editar')}>
      <SelectorEmoji valor={emoji} onCambio={setEmoji} />
      <CampoTexto etiqueta={t('inventario.producto.nombre')} value={nombre} onChangeText={setNombre} maxLength={80} />
      <CampoTexto etiqueta={t('inventario.producto.coleccion')} value={coleccion} onChangeText={setColeccion} maxLength={40} />
      <CampoDinero etiqueta={t('inventario.producto.precio')} valor={precio} onCambio={setPrecio} />
      <CampoCosto
        costo={costo}
        desglose={desglose}
        onCambio={(c, d) => {
          setCosto(c);
          setDesglose(d);
        }}
      />
      <LineaMargen precio={precio} costo={costo} />
      <CampoTexto
        etiqueta={t('inventario.producto.minimo')}
        ayuda={t('inventario.producto.minimoAyuda')}
        keyboardType="number-pad"
        value={minimo}
        onChangeText={(v) => setMinimo(v.replace(/\D/g, '').slice(0, 5))}
      />
      {error && <Aviso mensaje={error} />}
      <Boton titulo={t('inventario.detalleProducto.guardar')} onPress={guardar} cargando={guardando} />
      <Boton titulo={t('movimiento.cancelar')} variante="texto" onPress={onListo} />
    </PantallaAjuste>
  );
}
