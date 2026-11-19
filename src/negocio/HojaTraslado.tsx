import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Calendario } from '@/components/Calendario';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Icono } from '@/components/Icono';
import { TecladoNumerico } from '@/components/TecladoNumerico';
import { Texto } from '@/components/Texto';
import { sumarDias, type Fecha } from '@/lib/fechas';
import { saldoCuenta, validarTraslado, type MovNegocio, type Transferencia } from '@/lib/negocio';
import { fechaCorta } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { ALTO_TOCABLE, ESPACIO, RADIO, useTema } from '@/theme';

import { guardarTraslado, type Cuenta, type Tarjeta } from './datos';

type Props = {
  abierta: boolean;
  negocioId: string;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  movimientos: MovNegocio[];
  traslados: Transferencia[];
  hoy: Fecha;
  onCerrar: () => void;
  onGuardado: () => void;
};

/** "Mover plata o pagar una tarjeta" (spec 03, §4; reglas B2 y B3). */
export function HojaTraslado(props: Props) {
  const { colores } = useTema();
  return (
    <Modal visible={props.abierta} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        {props.abierta && <Formulario {...props} />}
      </SafeAreaView>
    </Modal>
  );
}

function Formulario({ negocioId, cuentas, tarjetas, movimientos, traslados, hoy, onCerrar, onGuardado }: Props) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const principal = cuentas.find((c) => c.principal)?.id ?? cuentas[0]?.id ?? null;
  const [desde, setDesde] = useState<string | null>(principal);
  const [hacia, setHacia] = useState<{ cuenta: string | null; tarjeta: string | null }>({ cuenta: null, tarjeta: null });
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState<Fecha>(hoy);
  const [verCalendario, setVerCalendario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ayer = sumarDias(hoy, -1);
  const otraFecha = fecha !== hoy && fecha !== ayer;

  const saldo = (id: string) => saldoCuenta({ id, saldoInicial: cuentas.find((c) => c.id === id)?.saldoInicial ?? 0 }, movimientos, traslados);

  async function guardar() {
    const valor = parseInt(monto || '0', 10);
    const codigo = validarTraslado({ desde, haciaCuenta: hacia.cuenta, haciaTarjeta: hacia.tarjeta, monto: valor });
    if (codigo) return setError(t(`errores.${codigo}`));
    setGuardando(true);
    const { error: e } = await guardarTraslado(negocioId, { fecha, desde: desde!, haciaCuenta: hacia.cuenta, haciaTarjeta: hacia.tarjeta, monto: valor, nota });
    setGuardando(false);
    if (e) return setError(t('negocioApp.traslado.error'));
    onGuardado();
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.s + 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comun.cerrar')}
          onPress={onCerrar}
          style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.relleno }}>
          <Icono nombre="cerrar" tamano={18} />
        </Pressable>
        <Texto variante="subtitulo" style={{ flex: 1 }}>
          {t('negocioApp.traslado.titulo')}
        </Texto>
      </View>

      <Texto variante="cifra" accessibilityLiveRegion="polite" style={{ textAlign: 'center', fontSize: 38, lineHeight: 46 }}>
        {plata(parseInt(monto || '0', 10))}
      </Texto>

      <Texto variante="fuerte">{t('negocioApp.traslado.desde')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {cuentas.map((c) => (
          <Chip
            key={c.id}
            texto={`${c.nombre} · ${plata(saldo(c.id))}`}
            elegido={desde === c.id}
            onPress={() => {
              setDesde(c.id);
              if (hacia.cuenta === c.id) setHacia({ cuenta: null, tarjeta: null });
            }}
          />
        ))}
      </View>

      <Texto variante="fuerte">{t('negocioApp.traslado.hacia')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {cuentas
          .filter((c) => c.id !== desde)
          .map((c) => (
            <Chip key={c.id} texto={c.nombre} elegido={hacia.cuenta === c.id} onPress={() => setHacia({ cuenta: c.id, tarjeta: null })} />
          ))}
      </View>
      {tarjetas.length > 0 && (
        <>
          <Texto variante="etiqueta">{t('negocioApp.traslado.tarjetas')}</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
            {tarjetas.map((tj) => (
              <Chip key={tj.id} texto={tj.nombre} elegido={hacia.tarjeta === tj.id} onPress={() => setHacia({ cuenta: null, tarjeta: tj.id })} />
            ))}
          </View>
        </>
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

      <CampoTexto etiqueta="" accessibilityLabel={t('negocioApp.traslado.nota')} placeholder={t('negocioApp.traslado.nota')} value={nota} onChangeText={setNota} maxLength={80} />

      <TecladoNumerico valor={monto} onCambio={setMonto} compacto />

      {error && <Aviso mensaje={error} />}
      <Boton titulo={t('negocioApp.traslado.guardar')} onPress={guardar} cargando={guardando} />
    </ScrollView>
  );
}
