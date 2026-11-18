import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePerfil } from '@/auth/perfil';
import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { Icono } from '@/components/Icono';
import { Texto } from '@/components/Texto';
import { paisPorCodigo } from '@/onboarding/paises';
import { ALTO_TOCABLE, ESPACIO, useTema } from '@/theme';

export type CampoMonto = { clave: string; etiqueta: string; ayuda?: string; tipo: 'plata' | 'porcentaje'; obligatorio?: boolean };
export type ValoresItem = { nombre: string; emoji: string; montos: Record<string, number> };

function Hoja({ abierta, onCerrar, children }: { abierta: boolean; onCerrar: () => void; children: React.ReactNode }) {
  const { colores } = useTema();
  return (
    <Modal visible={abierta} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        {abierta && children}
      </SafeAreaView>
    </Modal>
  );
}

function Cabecera({ titulo, onCerrar, emoji }: { titulo: string; onCerrar: () => void; emoji?: string }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('comun.cerrar')}
        onPress={onCerrar}
        style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.relleno }}>
        <Icono nombre="cerrar" tamano={18} />
      </Pressable>
      <Texto variante="titulo" style={{ flex: 1 }}>
        {titulo}
      </Texto>
      {emoji ? <Emoji name={emoji as NombreEmoji} size={40} /> : null}
    </View>
  );
}

/** Crear o editar una meta, una deuda o algo que tienes: nombre, ícono 3D y montos. */
export function HojaItem({
  abierta,
  titulo,
  ejemplo,
  emojis,
  campos,
  inicial,
  onCerrar,
  onGuardar,
  onBorrar,
}: {
  abierta: boolean;
  titulo: string;
  ejemplo: string;
  emojis: NombreEmoji[];
  campos: CampoMonto[];
  inicial?: ValoresItem;
  onCerrar: () => void;
  onGuardar: (valores: ValoresItem) => Promise<{ error: unknown }>;
  onBorrar?: () => Promise<{ error: unknown }>;
}) {
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar}>
      <FormularioItem titulo={titulo} ejemplo={ejemplo} emojis={emojis} campos={campos} inicial={inicial} onCerrar={onCerrar} onGuardar={onGuardar} onBorrar={onBorrar} />
    </Hoja>
  );
}

function FormularioItem({
  titulo,
  ejemplo,
  emojis,
  campos,
  inicial,
  onCerrar,
  onGuardar,
  onBorrar,
}: Omit<Parameters<typeof HojaItem>[0], 'abierta'>) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const perfil = usePerfil();
  const separador = paisPorCodigo(perfil?.country ?? 'CO').separador;
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [emoji, setEmoji] = useState(inicial?.emoji ?? emojis[0]);
  const [montos, setMontos] = useState<Record<string, number>>(inicial?.montos ?? {});
  const [textos, setTextos] = useState<Record<string, string>>(
    Object.fromEntries(campos.filter((c) => c.tipo === 'porcentaje').map((c) => [c.clave, inicial ? String(inicial.montos[c.clave] ?? 0).replace('.', ',') : ''])),
  );
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const faltaNombre = !nombre.trim();
  const faltaMonto = campos.some((c) => c.obligatorio && !(montos[c.clave] > 0));

  async function guardar() {
    setIntentado(true);
    if (faltaNombre || faltaMonto) return;
    setGuardando(true);
    const { error: e } = await onGuardar({ nombre, emoji, montos });
    setGuardando(false);
    if (e) setError(true);
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
      <Cabecera titulo={titulo} onCerrar={onCerrar} emoji={emoji} />
      <CampoTexto
        etiqueta={t('planPersonal.nombre')}
        value={nombre}
        onChangeText={setNombre}
        placeholder={ejemplo}
        autoCapitalize="sentences"
        maxLength={40}
        error={intentado && faltaNombre ? t('planPersonal.faltaNombre') : null}
      />
      {campos.map((c) =>
        c.tipo === 'plata' ? (
          <CampoDinero
            key={c.clave}
            etiqueta={c.etiqueta}
            ayuda={c.ayuda}
            valor={montos[c.clave] ?? 0}
            onCambio={(v) => setMontos((m) => ({ ...m, [c.clave]: v }))}
            separador={separador}
            error={intentado && c.obligatorio && !(montos[c.clave] > 0) ? t('planPersonal.faltaMonto') : null}
          />
        ) : (
          <CampoTexto
            key={c.clave}
            etiqueta={c.etiqueta}
            ayuda={c.ayuda}
            keyboardType="decimal-pad"
            value={textos[c.clave] ?? ''}
            placeholder="0"
            onChangeText={(texto) => {
              const limpio = texto.replace(/[^\d.,]/g, '').slice(0, 6);
              setTextos((x) => ({ ...x, [c.clave]: limpio }));
              const numero = parseFloat(limpio.replace(',', '.'));
              setMontos((m) => ({ ...m, [c.clave]: Number.isFinite(numero) ? Math.min(300, numero) : 0 }));
            }}
          />
        ),
      )}
      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="fuerte">{t('planPersonal.icono')}</Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
          {emojis.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="radio"
              accessibilityLabel={e}
              accessibilityState={{ selected: emoji === e }}
              onPress={() => setEmoji(e)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: emoji === e ? colores.accion : 'transparent',
                backgroundColor: colores.tarjeta,
              }}>
              <Emoji name={e} size={30} />
            </Pressable>
          ))}
        </View>
      </View>
      {error && <Aviso mensaje={t('planPersonal.error')} />}
      <Boton titulo={t('planPersonal.guardar')} onPress={guardar} cargando={guardando} />
      {onBorrar &&
        (confirmarBorrar ? (
          <View style={{ gap: ESPACIO.s }}>
            <Texto variante="fuerte" style={{ textAlign: 'center' }}>
              {t('planPersonal.confirmarBorrar')}
            </Texto>
            <Boton
              titulo={t('planPersonal.borrar')}
              variante="secundario"
              onPress={async () => {
                const { error: e } = await onBorrar();
                if (e) setError(true);
              }}
            />
            <Boton titulo={t('planPersonal.cancelar')} variante="texto" onPress={() => setConfirmarBorrar(false)} />
          </View>
        ) : (
          <Boton titulo={t('planPersonal.borrar')} variante="texto" onPress={() => setConfirmarBorrar(true)} />
        ))}
    </ScrollView>
  );
}

/** Abonar un monto escrito por la persona (cuando no sirve ningún botón rápido). */
export function HojaAbono({
  abierta,
  titulo,
  emoji,
  onCerrar,
  onAbonar,
}: {
  abierta: boolean;
  titulo: string;
  emoji: string;
  onCerrar: () => void;
  onAbonar: (monto: number) => Promise<{ error: unknown }>;
}) {
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar}>
      <FormularioAbono titulo={titulo} emoji={emoji} onCerrar={onCerrar} onAbonar={onAbonar} />
    </Hoja>
  );
}

function FormularioAbono({ titulo, emoji, onCerrar, onAbonar }: { titulo: string; emoji: string; onCerrar: () => void; onAbonar: (monto: number) => Promise<{ error: unknown }> }) {
  const { t } = useTranslation();
  const perfil = usePerfil();
  const separador = paisPorCodigo(perfil?.country ?? 'CO').separador;
  const [monto, setMonto] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  return (
    <View style={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
      <Cabecera titulo={titulo} onCerrar={onCerrar} emoji={emoji} />
      <CampoDinero etiqueta={t('planPersonal.abonarCuanto')} valor={monto} onCambio={setMonto} separador={separador} autoFocus />
      {error && <Aviso mensaje={t('planPersonal.error')} />}
      <Boton
        titulo={t('planPersonal.abonar')}
        disabled={monto <= 0}
        cargando={guardando}
        onPress={async () => {
          setGuardando(true);
          const { error: e } = await onAbonar(monto);
          setGuardando(false);
          if (e) setError(true);
        }}
      />
    </View>
  );
}
