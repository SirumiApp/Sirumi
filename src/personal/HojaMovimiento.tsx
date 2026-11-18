import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
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
import { ALTO_TOCABLE, COLORES_CATEGORIA, ESPACIO, FUENTES, RADIO, useTema, type ColorCategoria } from '@/theme';

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

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Texto variante="subtitulo">{movimiento ? t('movimiento.editar') : t('movimiento.nuevo')}</Texto>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comun.cerrar')}
          onPress={onCerrar}
          style={{ minWidth: ALTO_TOCABLE, minHeight: ALTO_TOCABLE, alignItems: 'center', justifyContent: 'center' }}>
          <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 20 }}>✕</Texto>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        <Chip texto={t('movimiento.gasto')} elegido={tipo === 'gasto'} onPress={() => cambiarTipo('gasto')} />
        <Chip texto={t('movimiento.ingreso')} elegido={tipo === 'ingreso'} onPress={() => cambiarTipo('ingreso')} />
      </View>

      <Texto
        variante="cifra"
        accessibilityLiveRegion="polite"
        style={{ textAlign: 'center', fontSize: 40, lineHeight: 50, color: tipo === 'ingreso' ? colores.ingreso : colores.texto }}>
        {plata(parseInt(monto || '0', 10))}
      </Texto>

      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="fuerte">{t('movimiento.categoria')}</Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
          {visibles.map((c) => {
            const elegida = categoria === c.id;
            const tinte = COLORES_CATEGORIA[(c.color as ColorCategoria) in COLORES_CATEGORIA ? (c.color as ColorCategoria) : 'gris'];
            return (
              <Pressable
                key={c.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: elegida }}
                onPress={() => setCategoria(c.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: ESPACIO.xs,
                  minHeight: ALTO_TOCABLE,
                  paddingHorizontal: ESPACIO.m,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: elegida ? colores.accion : 'transparent',
                  backgroundColor: oscuro ? tinte.oscuro : tinte.claro,
                }}>
                <Emoji name={c.emoji as NombreEmoji} size={22} />
                <Texto variante="fuerte">{nombreCategoria(c)}</Texto>
              </Pressable>
            );
          })}
        </View>
      </View>

      <CampoTexto
        etiqueta={t('movimiento.descripcion')}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder={t('movimiento.ejemploDescripcion')}
        autoCapitalize="sentences"
        maxLength={120}
      />

      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="fuerte">{t('movimiento.fecha')}</Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
          <Chip texto={t('fechas.hoy')} elegido={fecha === hoy} onPress={() => { setFecha(hoy); setVerCalendario(false); }} />
          <Chip texto={t('fechas.ayer')} elegido={fecha === ayer} onPress={() => { setFecha(ayer); setVerCalendario(false); }} />
          <Chip
            texto={fecha !== hoy && fecha !== ayer ? fechaCorta(fecha, textosFecha, true) : t('movimiento.otraFecha')}
            elegido={fecha !== hoy && fecha !== ayer}
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
      </View>

      <TecladoNumerico valor={monto} onCambio={setMonto} />

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
