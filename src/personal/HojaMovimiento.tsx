import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Calendario } from '@/components/Calendario';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { TecladoNumerico } from '@/components/TecladoNumerico';
import { Texto } from '@/components/Texto';
import { sumarDias, type Fecha } from '@/lib/fechas';
import type { Movimiento, TipoMovimiento } from '@/lib/personal';
import { interpretarFrase } from '@/lib/voz';
import { ALTO_TOCABLE, COLORES_CATEGORIA, ESPACIO, FUENTES, PALETA, RADIO, sombraAccion, useTema, type ColorCategoria } from '@/theme';

import { borrarMovimiento, guardarMovimiento, type Categoria } from './datos';
import { fechaCorta } from './etiquetas';
import { useNombreCategoria, usePlata, useTextosFecha } from './ganchos';

type Props = {
  abierta: boolean;
  /** Si viene, se edita ese movimiento; si no, es uno nuevo. */
  movimiento: Movimiento | null;
  categorias: Categoria[];
  hoy: Fecha;
  onCerrar: () => void;
  onGuardado: () => void;
};

/** Hoja para registrar, editar o borrar un gasto o un ingreso. */
export function HojaMovimiento(props: Props) {
  const { colores } = useTema();
  return (
    <Modal visible={props.abierta} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        {/* La key reinicia el formulario cada vez que se abre con otro movimiento. */}
        {props.abierta && <Formulario key={props.movimiento?.id ?? 'nuevo'} {...props} />}
      </SafeAreaView>
    </Modal>
  );
}

function Formulario({ movimiento, categorias, hoy, onCerrar, onGuardado }: Props) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const nombreCategoria = useNombreCategoria();
  const textosFecha = useTextosFecha();

  const [tipo, setTipo] = useState<TipoMovimiento>(movimiento?.tipo ?? 'gasto');
  const [monto, setMonto] = useState(movimiento ? String(movimiento.monto) : '');
  const [categoria, setCategoria] = useState<string | null>(movimiento?.categoria || null);
  const [descripcion, setDescripcion] = useState(movimiento?.descripcion ?? '');
  const [fecha, setFecha] = useState<Fecha>(movimiento?.fecha ?? hoy);
  const [verCalendario, setVerCalendario] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frase, setFrase] = useState('');
  const [dictando, setDictando] = useState(false);
  const campoFrase = useRef<TextInputInstance>(null);
  // Para deslizar la fila de categorías hasta la elegida (por ejemplo, cuando la dicta la persona).
  const filaCategorias = useRef<ScrollViewInstance>(null);
  const posiciones = useRef<Record<string, number>>({});

  useEffect(() => {
    const x = categoria ? posiciones.current[categoria] : undefined;
    if (x !== undefined) filaCategorias.current?.scrollTo({ x: Math.max(0, x - ESPACIO.m), animated: true });
  }, [categoria]);

  /** Llena el formulario con lo que la persona dijo o escribió (solo lo que se reconoce). */
  function entenderFrase(texto: string) {
    setFrase(texto);
    const r = interpretarFrase(texto);
    if (r.monto > 0) setMonto(String(r.monto));
    if (r.descripcion) setDescripcion(r.descripcion);
    const porClave = r.categoria ? categorias.find((c) => c.key === r.categoria && !c.hidden) : undefined;
    if (porClave) {
      setTipo(porClave.kind as TipoMovimiento);
      setCategoria(porClave.id);
    } else if (r.tipo !== tipo && r.tipo === 'ingreso') {
      cambiarTipo('ingreso');
    }
    setError(null);
  }

  const visibles = categorias.filter((c) => c.kind === tipo && (!c.hidden || c.id === categoria));
  const ayer = sumarDias(hoy, -1);

  function cambiarTipo(nuevo: TipoMovimiento) {
    setTipo(nuevo);
    // Si cambia a ingreso, elige la categoría de ingreso; si vuelve a gasto, que la elija.
    const deEseTipo = categorias.filter((c) => c.kind === nuevo && !c.hidden);
    setCategoria(deEseTipo.length === 1 ? deEseTipo[0].id : null);
  }

  async function guardar() {
    const valor = parseInt(monto || '0', 10);
    if (!valor) return setError(t('movimiento.faltaMonto'));
    const categoriaFinal = categoria ?? (visibles.length === 1 ? visibles[0].id : null);
    if (!categoriaFinal) return setError(t('movimiento.faltaCategoria'));
    setGuardando(true);
    const { error: e } = await guardarMovimiento({ fecha, tipo, monto: valor, categoria: categoriaFinal, descripcion }, movimiento?.id);
    setGuardando(false);
    if (e) return setError(t('movimiento.errorGuardar'));
    onGuardado();
  }

  async function borrar() {
    if (!movimiento) return;
    setGuardando(true);
    const { error: e } = await borrarMovimiento(movimiento.id);
    setGuardando(false);
    if (e) return setError(t('movimiento.errorGuardar'));
    onGuardado();
  }

  const tinteDe = (c: Categoria) => {
    const tinte = COLORES_CATEGORIA[(c.color as ColorCategoria) in COLORES_CATEGORIA ? (c.color as ColorCategoria) : 'gris'];
    return oscuro ? tinte.oscuro : tinte.claro;
  };
  const otraFecha = fecha !== hoy && fecha !== ayer;

  // Diseñada para caber en una sola pantalla: sin títulos de sección y con las categorías en una fila que se desliza.
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.s + 2 }}>
      {/* Cerrar a la izquierda: a la derecha lo tapa el botón de Expo Go mientras probamos */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comun.cerrar')}
          onPress={onCerrar}
          hitSlop={8}
          style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.relleno }}>
          <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 18 }}>✕</Texto>
        </Pressable>
        <Texto variante="subtitulo" style={{ flex: 1 }}>
          {movimiento ? t('movimiento.editar') : t('movimiento.nuevo')}
        </Texto>
        <View style={{ flexDirection: 'row', gap: ESPACIO.xs }} accessibilityRole="radiogroup">
          <Chip texto={t('movimiento.gasto')} elegido={tipo === 'gasto'} onPress={() => cambiarTipo('gasto')} />
          <Chip texto={t('movimiento.ingreso')} elegido={tipo === 'ingreso'} onPress={() => cambiarTipo('ingreso')} />
        </View>
      </View>

      {/* Dictado: botón de micrófono que abre el teclado; su micrófono escribe la frase y la app la entiende */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: ESPACIO.s,
          paddingLeft: ESPACIO.m,
          paddingRight: 4,
          minHeight: ALTO_TOCABLE + 8,
          borderRadius: 999,
          backgroundColor: colores.relleno,
          borderWidth: 2,
          borderColor: dictando ? colores.accion : 'transparent',
        }}>
        <TextInput
          ref={campoFrase}
          accessibilityLabel={t('movimiento.dictar')}
          value={frase}
          onChangeText={entenderFrase}
          onFocus={() => setDictando(true)}
          onBlur={() => setDictando(false)}
          placeholder={`${t('movimiento.dictar')} · ${t('movimiento.dictarEjemplo')}`}
          placeholderTextColor={colores.textoSuave}
          autoCapitalize="sentences"
          returnKeyType="done"
          style={[
            { flex: 1, fontFamily: FUENTES.texto, fontSize: 16, color: colores.texto, paddingVertical: ESPACIO.s },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('movimiento.dictarBoton')}
          onPress={() => campoFrase.current?.focus()}
          style={({ pressed }) => [
            {
              width: ALTO_TOCABLE,
              height: ALTO_TOCABLE,
              borderRadius: ALTO_TOCABLE / 2,
              alignItems: 'center',
              justifyContent: 'center',
              // Celeste claro siempre: el micrófono 3D tiene partes azul Noche (docs/marca.md).
              backgroundColor: PALETA.hielo,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
            sombraAccion(oscuro),
          ]}>
          <Emoji name="microfono" size={26} conFondo={false} />
        </Pressable>
      </View>
      {dictando && <Texto variante="pequeno">{t('movimiento.dictarTip')}</Texto>}

      <Texto
        variante="cifra"
        accessibilityLiveRegion="polite"
        style={{ textAlign: 'center', fontSize: 38, lineHeight: 46, color: tipo === 'ingreso' ? colores.ingreso : colores.texto }}>
        {plata(parseInt(monto || '0', 10))}
      </Texto>

      {/* Categorías: una sola fila que se desliza de lado */}
      <ScrollView
        ref={filaCategorias}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }}
        contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('movimiento.categoria')}>
        {visibles.map((c) => {
          const elegida = categoria === c.id;
          return (
            <Pressable
              key={c.id}
              onLayout={(e) => {
                posiciones.current[c.id] = e.nativeEvent.layout.x;
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegida }}
              onPress={() => setCategoria(c.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: ESPACIO.xs,
                minHeight: ALTO_TOCABLE,
                paddingHorizontal: ESPACIO.m,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: elegida ? colores.accion : 'transparent',
                backgroundColor: tinteDe(c),
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}>
              <Emoji name={c.emoji as NombreEmoji} size={22} />
              <Texto variante="fuerte">{nombreCategoria(c)}</Texto>
            </Pressable>
          );
        })}
      </ScrollView>

      <CampoTexto
        etiqueta=""
        accessibilityLabel={t('movimiento.descripcion')}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder={t('movimiento.descripcion')}
        autoCapitalize="sentences"
        maxLength={120}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityLabel={t('movimiento.fecha')}>
        <Chip texto={t('fechas.hoy')} elegido={fecha === hoy} onPress={() => { setFecha(hoy); setVerCalendario(false); }} />
        <Chip texto={t('fechas.ayer')} elegido={fecha === ayer} onPress={() => { setFecha(ayer); setVerCalendario(false); }} />
        <Chip
          texto={otraFecha ? fechaCorta(fecha, textosFecha, true) : t('movimiento.otraFecha')}
          elegido={otraFecha}
          onPress={() => setVerCalendario((v) => !v)}
        />
      </View>
      {verCalendario && (
        <View style={{ backgroundColor: colores.tarjeta, borderRadius: RADIO.l, padding: ESPACIO.s }}>
          <Calendario
            hoy={hoy}
            modo="uno"
            valor={{ desde: fecha, hasta: fecha }}
            onCambio={(v) => {
              if (v.desde) setFecha(v.desde);
              setVerCalendario(false);
            }}
          />
        </View>
      )}

      <TecladoNumerico valor={monto} onCambio={setMonto} compacto />

      {error && <Aviso mensaje={error} />}

      <Boton titulo={t('movimiento.guardar')} onPress={guardar} cargando={guardando} />

      {movimiento &&
        (confirmarBorrar ? (
          <View style={{ gap: ESPACIO.s }}>
            <Texto variante="fuerte" style={{ textAlign: 'center' }}>
              {t('movimiento.confirmarBorrar')}
            </Texto>
            <Boton titulo={t('movimiento.siBorrar')} variante="secundario" onPress={borrar} cargando={guardando} />
            <Boton titulo={t('movimiento.cancelar')} variante="texto" onPress={() => setConfirmarBorrar(false)} />
          </View>
        ) : (
          <Boton titulo={t('movimiento.borrar')} variante="texto" onPress={() => setConfirmarBorrar(true)} />
        ))}
    </ScrollView>
  );
}
