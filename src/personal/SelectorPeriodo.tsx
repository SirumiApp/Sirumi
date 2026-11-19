import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonCerrar } from '@/components/BotonCerrar';
import { Boton } from '@/components/Boton';
import { Calendario } from '@/components/Calendario';
import { Emoji } from '@/components/emoji/Emoji';
import { Icono } from '@/components/Icono';
import { Opcion } from '@/components/Opcion';
import { Texto } from '@/components/Texto';
import { partes, periodoPredefinido, type Fecha, type Periodo, type PeriodoPredefinido } from '@/lib/fechas';
import { ALTO_TOCABLE, ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

import { rangoCorto } from './etiquetas';
import { useTextosFecha } from './ganchos';

export type EleccionPeriodo = { tipo: PeriodoPredefinido } | { tipo: 'rango'; periodo: Periodo };

export function periodoDe(eleccion: EleccionPeriodo, hoy: Fecha): Periodo {
  return eleccion.tipo === 'rango' ? eleccion.periodo : periodoPredefinido(eleccion.tipo, hoy);
}

const PREDEFINIDOS: PeriodoPredefinido[] = ['mes', 'mesPasado', 'tresMeses', 'anio'];
const mayuscula = (s: string) => s.replace(/^./, (l) => l.toUpperCase());

/** Píldora de período arriba de Inicio ("Noviembre 2026 ▾", como el prototipo). Al tocarla, opciones y calendario. */
export function SelectorPeriodo({ eleccion, hoy, onCambio }: { eleccion: EleccionPeriodo; hoy: Fecha; onCambio: (e: EleccionPeriodo) => void }) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const textos = useTextosFecha();
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<{ desde: Fecha | null; hasta: Fecha | null }>({ desde: null, hasta: null });

  const nombreMesDe = (fecha: Fecha) => `${mayuscula(textos.mesesLargos[partes(fecha).mes - 1])} ${partes(fecha).anio}`;
  const etiqueta = (e: EleccionPeriodo) => {
    if (e.tipo === 'rango') return rangoCorto(e.periodo, textos);
    if (e.tipo === 'mes' || e.tipo === 'mesPasado') return nombreMesDe(periodoPredefinido(e.tipo, hoy).desde);
    return t(`periodo.${e.tipo}`);
  };

  function abrir() {
    setBorrador(eleccion.tipo === 'rango' ? eleccion.periodo : { desde: null, hasta: null });
    setAbierto(true);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta(eleccion)}. ${t('periodo.titulo')}`}
        onPress={abrir}
        style={({ pressed }) => [
          {
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: ESPACIO.s,
            minHeight: ALTO_TOCABLE + 4,
            paddingHorizontal: ESPACIO.m,
            borderRadius: 999,
            backgroundColor: colores.tarjeta,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
          sombraSuave(oscuro),
        ]}>
        <Emoji name="calendario" size={18} />
        <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 15 }}>{etiqueta(eleccion)}</Texto>
        <Icono nombre="abajo" tamano={16} color={colores.textoSuave} />
      </Pressable>

      <Modal visible={abierto} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAbierto(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
          <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
              <BotonCerrar onPress={() => setAbierto(false)} />
              <Texto variante="titulo" style={{ flex: 1 }}>
                {t('periodo.titulo')}
              </Texto>
            </View>
            <View style={{ gap: ESPACIO.s }}>
              {PREDEFINIDOS.map((p) => (
                <Opcion
                  key={p}
                  titulo={t(`periodo.${p}`)}
                  derecha={p === 'mes' || p === 'mesPasado' ? etiqueta({ tipo: p }) : undefined}
                  elegida={eleccion.tipo === p}
                  onPress={() => {
                    onCambio({ tipo: p });
                    setAbierto(false);
                  }}
                />
              ))}
            </View>
            <Texto variante="subtitulo">{t('periodo.elegir')}</Texto>
            <Texto variante="suave">{t('periodo.ayuda')}</Texto>
            <View style={[{ backgroundColor: colores.tarjeta, borderRadius: 20, padding: ESPACIO.s }, sombraSuave(oscuro)]}>
              <Calendario hoy={hoy} modo="rango" valor={borrador} onCambio={setBorrador} />
            </View>
            <Boton
              titulo={t('periodo.aplicar')}
              disabled={!borrador.desde}
              onPress={() => {
                if (!borrador.desde) return;
                onCambio({ tipo: 'rango', periodo: { desde: borrador.desde, hasta: borrador.hasta ?? borrador.desde } });
                setAbierto(false);
              }}
            />
            <Boton titulo={t('movimiento.cancelar')} variante="texto" onPress={() => setAbierto(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
