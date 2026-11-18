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
import { Icono } from '@/components/Icono';
import { TecladoNumerico } from '@/components/TecladoNumerico';
import { Texto } from '@/components/Texto';
import { sumarDias, type Fecha } from '@/lib/fechas';
import { cuentaDeEntrada, ORDEN_TIPOS, TIPOS_NEGOCIO, type MovNegocio, type TipoNegocio } from '@/lib/negocio';
import { fechaCorta } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { ALTO_TOCABLE, ESPACIO, RADIO, useTema } from '@/theme';

import { borrarMovNegocio, guardarMovNegocio, type Cuenta, type Tarjeta } from './datos';

export const EMOJI_TIPO: Record<TipoNegocio, NombreEmoji> = {
  venta: 'bolsas-de-compras',
  compra: 'paquete',
  fijo: 'edificio',
  variable: 'camion',
  inversion: 'herramientas',
  aporte: 'apreton-de-manos',
  prestamo: 'banco',
  retiro: 'persona',
  impuesto: 'recibo',
};

type Props = {
  abierta: boolean;
  movimiento: MovNegocio | null;
  negocioId: string | null;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  hoy: Fecha;
  onCerrar: () => void;
  onGuardado: () => void;
};

/** Registrar, editar, cobrar/pagar o borrar un movimiento del negocio (spec 03, §3; regla B1). */
export function HojaMovNegocio(props: Props) {
  const { colores } = useTema();
  return (
    <Modal visible={props.abierta} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        {props.abierta && <Formulario key={props.movimiento?.id ?? 'nuevo'} {...props} />}
      </SafeAreaView>
    </Modal>
  );
}

function Formulario({ movimiento, negocioId, cuentas, tarjetas, hoy, onCerrar, onGuardado }: Props) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const principal = cuentas.find((c) => c.principal)?.id ?? cuentas[0]?.id ?? null;

  const [tipo, setTipo] = useState<TipoNegocio>(movimiento?.tipo ?? 'venta');
  const [monto, setMonto] = useState(movimiento ? String(movimiento.monto) : '');
  const [concepto, setConcepto] = useState(movimiento?.concepto ?? '');
  const [pagado, setPagado] = useState(movimiento?.pagado ?? true);
  const [destino, setDestino] = useState<{ cuenta: string | null; tarjeta: string | null }>({
    cuenta: movimiento?.cuenta ?? (movimiento?.tarjeta ? null : principal),
    tarjeta: movimiento?.tarjeta ?? null,
  });
  const [fecha, setFecha] = useState<Fecha>(movimiento?.fecha ?? hoy);
  const [verCalendario, setVerCalendario] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reglas = TIPOS_NEGOCIO[tipo];
  const ayer = sumarDias(hoy, -1);
  const otraFecha = fecha !== hoy && fecha !== ayer;
  const conceptos = t(`negocioApp.tipos.${tipo}.conceptos`).split(',');

  function cambiarTipo(nuevo: TipoNegocio) {
    setTipo(nuevo);
    if (!TIPOS_NEGOCIO[nuevo].puedePendiente) setPagado(true);
    // B3: una entrada nunca va a una tarjeta.
    if (TIPOS_NEGOCIO[nuevo].entra && destino.tarjeta) setDestino({ cuenta: principal, tarjeta: null });
    if (!conceptos.includes(concepto)) return;
    setConcepto('');
  }

  async function guardar() {
    const valor = parseInt(monto || '0', 10);
    if (!valor) return setError(t('movimiento.faltaMonto'));
    if (!negocioId) return setError(t('negocioApp.movimiento.sinNegocio'));
    const final = reglas.entra ? cuentaDeEntrada(destino, principal ?? '') : destino;
    if (pagado && !final.cuenta && !final.tarjeta) return setError(t('negocioApp.movimiento.eligeCuenta'));
    setGuardando(true);
    const { error: e } = await guardarMovNegocio(
      negocioId,
      { fecha, tipo, monto: valor, pagado, cuenta: final.cuenta, tarjeta: final.tarjeta, concepto },
      movimiento?.id,
    );
    setGuardando(false);
    if (e) return setError(t('movimiento.errorGuardar'));
    onGuardado();
  }

  async function borrar() {
    if (!movimiento) return;
    setGuardando(true);
    const { error: e } = await borrarMovNegocio(movimiento.id);
    setGuardando(false);
    if (e) return setError(t('movimiento.errorGuardar'));
    onGuardado();
  }

  const opcionCuenta = (id: string, nombre: string, esTarjeta: boolean) => {
    const elegida = esTarjeta ? destino.tarjeta === id : destino.cuenta === id && !destino.tarjeta;
    return (
      <Chip
        key={id}
        texto={nombre}
        elegido={elegida}
        onPress={() => setDestino(esTarjeta ? { cuenta: null, tarjeta: id } : { cuenta: id, tarjeta: null })}
      />
    );
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.s + 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comun.cerrar')}
          onPress={onCerrar}
          style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.relleno }}>
          <Icono nombre="cerrar" tamano={18} />
        </Pressable>
        <Texto variante="subtitulo" style={{ flex: 1 }}>
          {movimiento ? t('negocioApp.movimiento.editar') : t('negocioApp.movimiento.nuevo')}
        </Texto>
      </View>

      {/* Tipo (B1): una fila que se desliza */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }}
        contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('negocioApp.movimiento.tipo')}>
        {ORDEN_TIPOS.map((tp) => {
          const elegido = tipo === tp;
          return (
            <Pressable
              key={tp}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegido }}
              onPress={() => cambiarTipo(tp)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: ESPACIO.xs,
                minHeight: ALTO_TOCABLE,
                paddingHorizontal: ESPACIO.m,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: elegido ? colores.accion : 'transparent',
                backgroundColor: elegido ? colores.seleccionado : colores.relleno,
              }}>
              <Emoji name={EMOJI_TIPO[tp]} size={20} />
              <Texto variante="fuerte">{t(`negocioApp.tipos.${tp}.nombre`)}</Texto>
            </Pressable>
          );
        })}
      </ScrollView>
      <Texto variante="pequeno">{t(`negocioApp.tipos.${tipo}.ayuda`)}</Texto>

      <Texto
        variante="cifra"
        accessibilityLiveRegion="polite"
        style={{ textAlign: 'center', fontSize: 38, lineHeight: 46 }}
        color={reglas.entra ? colores.ingresoTexto : colores.texto}>
        {plata(parseInt(monto || '0', 10))}
      </Texto>

      {/* Concepto: sugeridos según el tipo, o escrito */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }} contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}>
        {conceptos.map((c) => (
          <Chip key={c} texto={c} elegido={concepto === c} onPress={() => setConcepto(c)} />
        ))}
      </ScrollView>
      <CampoTexto etiqueta="" accessibilityLabel={t('negocioApp.movimiento.concepto')} placeholder={t('negocioApp.movimiento.ejemploConcepto')} value={concepto} onChangeText={setConcepto} maxLength={80} />

      {/* ¿Ya se pagó? (solo los tipos que pueden quedar pendientes) */}
      {reglas.puedePendiente && (
        <View style={{ flexDirection: 'row', gap: ESPACIO.s }} accessibilityRole="radiogroup" accessibilityLabel={t('negocioApp.movimiento.estado')}>
          <Chip texto={tipo === 'venta' ? t('negocioApp.movimiento.cobrado') : t('negocioApp.movimiento.pagado')} elegido={pagado} onPress={() => setPagado(true)} />
          <Chip texto={tipo === 'venta' ? t('negocioApp.movimiento.porCobrar') : t('negocioApp.movimiento.pendiente')} elegido={!pagado} onPress={() => setPagado(false)} />
        </View>
      )}

      {/* Cuenta o tarjeta (las tarjetas solo para salidas) */}
      {pagado && (
        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="fuerte">{reglas.entra ? t('negocioApp.movimiento.dondeEntra') : t('negocioApp.movimiento.dondeSale')}</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
            {cuentas.map((c) => opcionCuenta(c.id, c.nombre, false))}
          </View>
          {!reglas.entra && tarjetas.length > 0 && (
            <>
              <Texto variante="etiqueta">{t('negocioApp.movimiento.tarjetas')}</Texto>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
                {tarjetas.map((tj) => opcionCuenta(tj.id, tj.nombre, true))}
              </View>
            </>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityLabel={t('movimiento.fecha')}>
        <Chip texto={t('fechas.hoy')} elegido={fecha === hoy} onPress={() => { setFecha(hoy); setVerCalendario(false); }} />
        <Chip texto={t('fechas.ayer')} elegido={fecha === ayer} onPress={() => { setFecha(ayer); setVerCalendario(false); }} />
        <Chip texto={otraFecha ? fechaCorta(fecha, textosFecha, true) : t('movimiento.otraFecha')} elegido={otraFecha} onPress={() => setVerCalendario((v) => !v)} />
      </View>
      {verCalendario && (
        <View style={{ backgroundColor: colores.tarjeta, borderRadius: RADIO.l, padding: ESPACIO.s }}>
          <Calendario hoy={hoy} modo="uno" valor={{ desde: fecha, hasta: fecha }} onCambio={(v) => { if (v.desde) setFecha(v.desde); setVerCalendario(false); }} />
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
