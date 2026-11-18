import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Icono } from '@/components/Icono';
import { Interruptor } from '@/components/Interruptor';
import { Texto } from '@/components/Texto';
import { validarRecurrente, type Recurrente } from '@/lib/contactos';
import { ALTO_TOCABLE, ESPACIO, useTema } from '@/theme';

import { borrarRecurrente, guardarRecurrente, type Cuenta } from './datos';

type Props = { abierta: boolean; recurrente: Recurrente | null; negocioId: string; cuentas: Cuenta[]; onCerrar: () => void; onGuardado: () => void };

/** Crear o editar un pago recurrente (regla B10). */
export function HojaRecurrente(props: Props) {
  const { colores } = useTema();
  return (
    <Modal visible={props.abierta} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        {props.abierta && <Formulario key={props.recurrente?.id ?? 'nuevo'} {...props} />}
      </SafeAreaView>
    </Modal>
  );
}

function Formulario({ recurrente, negocioId, cuentas, onCerrar, onGuardado }: Props) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const principal = cuentas.find((c) => c.principal)?.id ?? null;
  const [nombre, setNombre] = useState(recurrente?.nombre ?? '');
  const [tipo, setTipo] = useState<Recurrente['tipo']>(recurrente?.tipo ?? 'fijo');
  const [monto, setMonto] = useState(recurrente?.monto ?? 0);
  const [dia, setDia] = useState(recurrente ? String(recurrente.dia) : '');
  const [cuenta, setCuenta] = useState<string | null>(recurrente?.cuenta ?? principal);
  const [activo, setActivo] = useState(recurrente?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const diaNum = parseInt(dia || '0', 10);
    const codigo = validarRecurrente({ nombre, monto, dia: diaNum });
    if (codigo) return setError(t(`errores.${codigo}`));
    setGuardando(true);
    const { error: e } = await guardarRecurrente(negocioId, { nombre, tipo, monto, dia: diaNum, cuenta, activo }, recurrente?.id);
    setGuardando(false);
    if (e) return setError(t('recurrentes.error'));
    onGuardado();
  }

  function preguntarBorrar() {
    if (!recurrente) return;
    Alert.alert(t('recurrentes.borrar'), t('recurrentes.confirmarBorrar'), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      {
        text: t('recurrentes.siBorrar'),
        style: 'destructive',
        onPress: async () => {
          const { error: e } = await borrarRecurrente(recurrente.id);
          if (e) return setError(t('recurrentes.error'));
          onGuardado();
        },
      },
    ]);
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comun.cerrar')}
          onPress={onCerrar}
          style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.relleno }}>
          <Icono nombre="cerrar" tamano={18} />
        </Pressable>
        <Texto variante="subtitulo" style={{ flex: 1 }}>
          {recurrente ? t('recurrentes.editar') : t('recurrentes.nuevo')}
        </Texto>
      </View>

      <CampoTexto etiqueta={t('recurrentes.nombre')} placeholder={t('recurrentes.ejemploNombre')} value={nombre} onChangeText={setNombre} maxLength={60} />
      <Texto variante="fuerte">{t('recurrentes.tipo')}</Texto>
      <View style={{ flexDirection: 'row', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        <Chip texto={t('negocioApp.tipos.fijo.nombre')} elegido={tipo === 'fijo'} onPress={() => setTipo('fijo')} />
        <Chip texto={t('negocioApp.tipos.variable.nombre')} elegido={tipo === 'variable'} onPress={() => setTipo('variable')} />
      </View>
      <CampoDinero etiqueta={t('recurrentes.monto')} valor={monto} onCambio={setMonto} />
      <CampoTexto
        etiqueta={t('recurrentes.dia')}
        ayuda={t('recurrentes.diaAyuda')}
        placeholder="5"
        keyboardType="number-pad"
        value={dia}
        onChangeText={(v) => setDia(v.replace(/\D/g, '').slice(0, 2))}
      />
      <Texto variante="fuerte">{t('recurrentes.cuenta')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {cuentas.map((c) => (
          <Chip key={c.id} texto={c.nombre} elegido={cuenta === c.id} onPress={() => setCuenta(c.id)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, minHeight: ALTO_TOCABLE }}>
        <Texto variante="fuerte" style={{ flex: 1 }}>
          {t('recurrentes.activo')}
        </Texto>
        <Interruptor etiqueta={t('recurrentes.activo')} encendido={activo} onCambio={setActivo} />
      </View>

      {error && <Aviso mensaje={error} />}
      <Boton titulo={t('recurrentes.guardar')} onPress={guardar} cargando={guardando} />
      {recurrente && <Boton titulo={t('recurrentes.borrar')} variante="texto" onPress={preguntarBorrar} />}
    </ScrollView>
  );
}
