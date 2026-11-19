import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { armarVariantes, codigoInterno, costoUnitario, margenProducto, validarProducto } from '@/lib/inventario';
import { useNegocio } from '@/negocio/contexto';
import { subirFotoProducto } from '@/negocio/fotos';
import { crearProducto, leerErrorInventario, type DesgloseCosto } from '@/negocio/inventarioDatos';
import { usePlata } from '@/personal/ganchos';
import { ALTO_TOCABLE, ESPACIO, FUENTES, RADIO, useTema } from '@/theme';

import { Escaner } from './Escaner';
import { EditorFoto } from './Foto';
import { CampoCantidad, SelectorEmoji, TALLAS } from './Piezas';

const DESGLOSE_VACIO: DesgloseCosto = { materia: 0, manoDeObra: 0, empaque: 0, otros: 0 };

/** Lo que muestra el margen del producto (C1) mientras se escribe. */
export function LineaMargen({ precio, costo }: { precio: number; costo: number }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  if (!precio) return null;
  const m = margenProducto(precio, costo);
  return (
    <Texto variante="medio" color={m.ganancia >= 0 ? colores.ingresoTexto : colores.errorTexto}>
      {m.ganancia >= 0
        ? t('inventario.producto.ganas', { monto: plata(m.ganancia), margen: String(Math.round(m.margen * 1000) / 10).replace('.', ',') })
        : t('inventario.producto.pierdes', { monto: plata(-m.ganancia) })}
    </Texto>
  );
}

/** Costo por unidad: el total, o desglosado (C1). */
export function CampoCosto({ costo, desglose, onCambio }: { costo: number; desglose: DesgloseCosto | null; onCambio: (costo: number, desglose: DesgloseCosto | null) => void }) {
  const { t } = useTranslation();
  const plata = usePlata();
  if (!desglose) {
    return (
      <View style={{ gap: ESPACIO.xs }}>
        <CampoDinero etiqueta={t('inventario.producto.costo')} ayuda={t('inventario.producto.costoAyuda')} valor={costo} onCambio={(v) => onCambio(v, null)} />
        <Boton titulo={t('inventario.producto.desglosar')} variante="texto" onPress={() => onCambio(costo, { ...DESGLOSE_VACIO, materia: costo })} />
      </View>
    );
  }
  const cambiar = (parte: keyof DesgloseCosto, v: number) => {
    const nuevo = { ...desglose, [parte]: v };
    onCambio(costoUnitario(nuevo), nuevo);
  };
  return (
    <Tarjeta style={{ gap: ESPACIO.s }}>
      {(['materia', 'manoDeObra', 'empaque', 'otros'] as const).map((parte) => (
        <CampoDinero key={parte} etiqueta={t(`inventario.producto.${parte}`)} valor={desglose[parte]} onCambio={(v) => cambiar(parte, v)} />
      ))}
      <Texto variante="fuerte">{t('inventario.producto.costoTotal', { monto: plata(costo) })}</Texto>
      <Boton titulo={t('inventario.producto.sinDesglosar')} variante="texto" onPress={() => onCambio(costo, null)} />
    </Tarjeta>
  );
}

/** Nuevo producto a mano (spec 04, §3): tallas × colores (C7), cantidades, códigos (C6) y bodega. */
export function NuevoProducto() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const { negocio, bodegas, productos, actualizar } = useNegocio();
  const principal = bodegas.find((b) => b.principal)?.id ?? bodegas[0]?.id ?? null;

  const [emoji, setEmoji] = useState('paquete');
  const [nombre, setNombre] = useState('');
  const [coleccion, setColeccion] = useState('');
  const [precio, setPrecio] = useState(0);
  const [costo, setCosto] = useState(0);
  const [desglose, setDesglose] = useState<DesgloseCosto | null>(null);
  const [minimo, setMinimo] = useState('');
  const [tallas, setTallas] = useState<string[]>([]);
  const [otraTalla, setOtraTalla] = useState('');
  const [colorNuevo, setColorNuevo] = useState('');
  const [coloresV, setColoresV] = useState<string[]>([]);
  // Por nombre de variante: cuántas hay y su código.
  const [datosV, setDatosV] = useState<Record<string, { cantidad: number; codigo: string }>>({});
  const [bodega, setBodega] = useState<string | null>(principal);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  // Variante a la que se le está escaneando el código.
  const [escaneando, setEscaneando] = useState<string | null>(null);

  const variantes = armarVariantes(tallas, coloresV);
  const dato = (n: string) => datosV[n] ?? { cantidad: 0, codigo: '' };
  const cambiarV = (n: string, c: Partial<{ cantidad: number; codigo: string }>) => setDatosV((d) => ({ ...d, [n]: { ...dato(n), ...c } }));
  const alternarTalla = (tl: string) => setTallas((l) => (l.includes(tl) ? l.filter((x) => x !== tl) : [...l, tl]));
  const agregarTalla = () => {
    const tl = otraTalla.trim();
    if (tl && !tallas.includes(tl)) setTallas((l) => [...l, tl]);
    setOtraTalla('');
  };
  const agregarColor = () => {
    const c = colorNuevo.trim();
    if (c && !coloresV.some((x) => x.toLowerCase() === c.toLowerCase())) setColoresV((l) => [...l, c.replace(/^./, (x) => x.toUpperCase())]);
    setColorNuevo('');
  };
  const hayCantidades = variantes.some((v) => dato(v.nombre).cantidad > 0);

  async function guardar() {
    if (!negocio) return;
    const usados = new Map(productos.flatMap((p) => p.variantes.filter((v) => v.codigo).map((v) => [v.codigo as string, p.nombre] as const)));
    const v = validarProducto({ nombre, precio, codigos: variantes.map((x) => dato(x.nombre).codigo) }, usados);
    if (v?.codigo === 'productoSinNombre' || v?.codigo === 'productoSinPrecio') return setError(t(`errores.${v.codigo}`));
    if (v?.codigo === 'codigoRepetido') return setError(t('inventario.errores.codigoRepetido', { codigo: v.valor }));
    if (v?.codigo === 'codigoDeOtro') return setError(t('inventario.errores.codigoDeOtro', { codigo: v.valor, producto: v.producto }));
    if (hayCantidades && !bodega) return setError(t('inventario.errores.sinBodega'));
    setGuardando(true);
    const { data: productoId, error: e } = await crearProducto(negocio.id, {
      nombre,
      coleccion,
      emoji,
      precio,
      costo,
      desglose,
      minimo: parseInt(minimo || '0', 10),
      bodega,
      variantes: variantes.map((x) => ({ color: x.color, talla: x.talla, codigo: dato(x.nombre).codigo, cantidad: dato(x.nombre).cantidad })),
    });
    const err = leerErrorInventario(e);
    if (err) {
      setGuardando(false);
      const conocido = ['codigoDeOtro', 'sinBodega', 'cantidadInvalida'].includes(err.codigo);
      return setError(conocido ? t(`inventario.errores.${err.codigo}` as 'inventario.errores.general', err.detalle) : t('inventario.errores.general'));
    }
    // La foto se sube cuando el producto ya existe (necesita su id).
    if (foto && typeof productoId === 'string') {
      const r = await subirFotoProducto(negocio.id, productoId, foto);
      if (r.error) setError(t('inventario.foto.error'));
    }
    setGuardando(false);
    actualizar();
    router.back();
  }

  return (
    <PantallaAjuste titulo={t('inventario.producto.nuevo')}>
      <EditorFoto url={foto} emoji={emoji} onElegida={setFoto} onQuitar={() => setFoto(null)} />
      {!foto && <SelectorEmoji valor={emoji} onCambio={setEmoji} />}
      <CampoTexto etiqueta={`${t('inventario.producto.nombre')} *`} placeholder={t('inventario.producto.ejemploNombre')} value={nombre} onChangeText={setNombre} maxLength={80} />
      <CampoTexto etiqueta={t('inventario.producto.coleccion')} placeholder={t('inventario.producto.ejemploColeccion')} value={coleccion} onChangeText={setColeccion} maxLength={40} />
      <CampoDinero etiqueta={`${t('inventario.producto.precio')} *`} valor={precio} onCambio={setPrecio} />
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
        placeholder="0"
        keyboardType="number-pad"
        value={minimo}
        onChangeText={(v) => setMinimo(v.replace(/\D/g, '').slice(0, 5))}
      />

      {/* Tallas y colores → variantes (C7) */}
      <Texto variante="subtitulo">{t('inventario.producto.tallas')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
        {[...TALLAS, ...tallas.filter((x) => !TALLAS.includes(x))].map((tl) => (
          <Chip key={tl} texto={tl} elegido={tallas.includes(tl)} onPress={() => alternarTalla(tl)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: ESPACIO.s, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <CampoTexto etiqueta="" accessibilityLabel={t('inventario.producto.otraTalla')} placeholder={t('inventario.producto.otraTalla')} value={otraTalla} onChangeText={setOtraTalla} onSubmitEditing={agregarTalla} maxLength={12} />
        </View>
        <Boton titulo={t('inventario.producto.agregar')} variante="secundario" onPress={agregarTalla} />
      </View>

      <Texto variante="subtitulo">{t('inventario.producto.colores')}</Texto>
      {coloresV.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
          {coloresV.map((c) => (
            <Chip key={c} texto={`${c}  ✕`} elegido accessibilityLabel={t('inventario.producto.quitarColor', { color: c })} onPress={() => setColoresV((l) => l.filter((x) => x !== c))} />
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: ESPACIO.s, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <CampoTexto etiqueta="" accessibilityLabel={t('inventario.producto.agregarColor')} placeholder={t('inventario.producto.agregarColor')} value={colorNuevo} onChangeText={setColorNuevo} onSubmitEditing={agregarColor} maxLength={24} />
        </View>
        <Boton titulo={t('inventario.producto.agregar')} variante="secundario" onPress={agregarColor} />
      </View>

      {/* Variantes: cantidad inicial y código de barras (C6) */}
      <Texto variante="subtitulo">{t('inventario.producto.variantes')}</Texto>
      <Texto variante="pequeno">{t('inventario.producto.variantesAyuda')}</Texto>
      {variantes.map((v) => (
        <Tarjeta key={v.nombre} style={{ gap: ESPACIO.s, padding: ESPACIO.m }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
            <Texto variante="fuerte" style={{ flex: 1 }}>
              {v.nombre}
            </Texto>
            <CampoCantidad etiqueta={v.nombre} valor={dato(v.nombre).cantidad} onCambio={(c) => cambiarV(v.nombre, { cantidad: c })} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
            <TextInput
              accessibilityLabel={`${t('inventario.producto.codigo')} ${v.nombre}`}
              placeholder={t('inventario.producto.codigo')}
              placeholderTextColor={colores.textoSuave}
              keyboardType="number-pad"
              value={dato(v.nombre).codigo}
              onChangeText={(c) => cambiarV(v.nombre, { codigo: c.replace(/\s/g, '') })}
              maxLength={20}
              style={{ flex: 1, minWidth: 0, minHeight: ALTO_TOCABLE, borderRadius: RADIO.m, paddingHorizontal: ESPACIO.m, backgroundColor: colores.relleno, color: colores.texto, fontFamily: FUENTES.textoMedio, fontSize: 15 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('inventario.escaner.escanear')} ${v.nombre}`}
              onPress={() => setEscaneando(v.nombre)}
              style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.seleccionado }}>
              <Emoji name="camara" size={22} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => cambiarV(v.nombre, { codigo: codigoInterno() })}
              style={{ minHeight: ALTO_TOCABLE, paddingHorizontal: ESPACIO.m, borderRadius: 999, justifyContent: 'center', backgroundColor: colores.seleccionado }}>
              <Texto variante="fuerte" color={colores.enlace}>
                {t('inventario.producto.generar')}
              </Texto>
            </Pressable>
          </View>
        </Tarjeta>
      ))}
      {variantes.length > 1 && (
        <Boton
          titulo={t('inventario.producto.generarTodos')}
          variante="texto"
          onPress={() => variantes.forEach((v) => !dato(v.nombre).codigo && cambiarV(v.nombre, { codigo: codigoInterno() }))}
        />
      )}

      {hayCantidades && bodegas.length > 1 && (
        <>
          <Texto variante="fuerte">{t('inventario.producto.bodega')}</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
            {bodegas.map((b) => (
              <Chip key={b.id} texto={b.nombre} elegido={bodega === b.id} onPress={() => setBodega(b.id)} />
            ))}
          </View>
        </>
      )}

      {error && <Aviso mensaje={error} />}
      <Boton titulo={t('inventario.producto.guardar')} onPress={guardar} cargando={guardando} />
      <Escaner
        abierto={escaneando !== null}
        onCerrar={() => setEscaneando(null)}
        onCodigo={(codigo) => {
          if (escaneando) cambiarV(escaneando, { codigo });
          setEscaneando(null);
        }}
      />
    </PantallaAjuste>
  );
}
