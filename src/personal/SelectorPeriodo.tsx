import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '@/components/Boton';
import { Calendario } from '@/components/Calendario';
import { Chip } from '@/components/Chip';
import { Texto } from '@/components/Texto';
import { periodoPredefinido, type Fecha, type Periodo, type PeriodoPredefinido } from '@/lib/fechas';
import { ESPACIO, useTema } from '@/theme';

import { rangoCorto } from './etiquetas';
import { useTextosFecha } from './ganchos';

export type EleccionPeriodo = { tipo: PeriodoPredefinido } | { tipo: 'rango'; periodo: Periodo };

export function periodoDe(eleccion: EleccionPeriodo, hoy: Fecha): Periodo {
  return eleccion.tipo === 'rango' ? eleccion.periodo : periodoPredefinido(eleccion.tipo, hoy);
}

const PREDEFINIDOS: PeriodoPredefinido[] = ['mes', 'mesPasado', 'tresMeses', 'anio'];

/** Chips de período arriba de Inicio y calendario para un rango libre (sin días futuros). */
export function SelectorPeriodo({ eleccion, hoy, onCambio }: { eleccion: EleccionPeriodo; hoy: Fecha; onCambio: (e: EleccionPeriodo) => void }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const textos = useTextosFecha();
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<{ desde: Fecha | null; hasta: Fecha | null }>({ desde: null, hasta: null });

  function abrir() {
    setBorrador(eleccion.tipo === 'rango' ? eleccion.periodo : { desde: null, hasta: null });
    setAbierto(true);
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: ESPACIO.s, alignItems: 'center' }}>
        {PREDEFINIDOS.map((p) => (
          <Chip key={p} texto={t(`periodo.${p}`)} elegido={eleccion.tipo === p} onPress={() => onCambio({ tipo: p })} />
        ))}
        <Chip
          texto={eleccion.tipo === 'rango' ? rangoCorto(eleccion.periodo, textos) : t('periodo.elegir')}
          elegido={eleccion.tipo === 'rango'}
          onPress={abrir}
        />
      </ScrollView>

      <Modal visible={abierto} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAbierto(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
          <View style={{ padding: ESPACIO.m, gap: ESPACIO.m, flex: 1 }}>
            <Texto variante="titulo">{t('periodo.titulo')}</Texto>
            <Texto variante="suave">{t('periodo.ayuda')}</Texto>
            <Calendario hoy={hoy} modo="rango" valor={borrador} onCambio={setBorrador} />
            <View style={{ flex: 1 }} />
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
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
