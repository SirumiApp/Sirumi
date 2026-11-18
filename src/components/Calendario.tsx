import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { armarFecha, diasDelMes, partes, type Fecha, type Periodo } from '@/lib/fechas';
import { ALTO_TOCABLE, ESPACIO, FUENTES, useTema } from '@/theme';

import { Texto } from './Texto';

type Props = {
  hoy: Fecha;
  /** Un día (modo "uno") o un rango (modo "rango"). En rango, `hasta` puede faltar mientras se elige. */
  valor: { desde: Fecha | null; hasta: Fecha | null };
  modo: 'uno' | 'rango';
  onCambio: (valor: { desde: Fecha | null; hasta: Fecha | null }) => void;
};

/** Calendario de un mes. No deja escoger días futuros. */
export function Calendario({ hoy, valor, modo, onCambio }: Props) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const inicial = partes(valor.desde ?? hoy);
  const [vista, setVista] = useState({ anio: inicial.anio, mes: inicial.mes });
  const mesesLargos = t('fechas.mesesLargos').split(',');
  const diasSemana = t('fechas.diasSemana').split(',');
  const limite = partes(hoy);
  const esUltimoMes = vista.anio === limite.anio && vista.mes === limite.mes;

  // Lunes = 0.
  const primerDia = (new Date(Date.UTC(vista.anio, vista.mes - 1, 1)).getUTCDay() + 6) % 7;
  const celdas: (Fecha | null)[] = [
    ...Array.from({ length: primerDia }, () => null),
    ...Array.from({ length: diasDelMes(vista.anio, vista.mes) }, (_, i) => armarFecha(vista.anio, vista.mes, i + 1)),
  ];

  function mover(delta: number) {
    setVista(({ anio, mes }) => {
      let m = mes + delta;
      let a = anio;
      if (m < 1) [m, a] = [12, a - 1];
      if (m > 12) [m, a] = [1, a + 1];
      return { anio: a, mes: m };
    });
  }

  function tocar(dia: Fecha) {
    if (modo === 'uno') return onCambio({ desde: dia, hasta: dia });
    const { desde, hasta } = valor;
    if (!desde || hasta) return onCambio({ desde: dia, hasta: null });
    if (dia < desde) return onCambio({ desde: dia, hasta: null });
    onCambio({ desde, hasta: dia });
  }

  const flecha = (texto: string, accion: () => void, desactivada = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={accion}
      disabled={desactivada}
      style={{ minWidth: ALTO_TOCABLE, minHeight: ALTO_TOCABLE, alignItems: 'center', justifyContent: 'center', opacity: desactivada ? 0.3 : 1 }}>
      <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 20 }}>{texto}</Texto>
    </Pressable>
  );

  return (
    <View style={{ gap: ESPACIO.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {flecha('‹', () => mover(-1))}
        <Texto variante="subtitulo">
          {mesesLargos[vista.mes - 1].replace(/^./, (l) => l.toUpperCase())} {vista.anio}
        </Texto>
        {flecha('›', () => mover(1), esUltimoMes)}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {diasSemana.map((d, i) => (
          <Texto key={i} variante="pequeno" style={{ flex: 1, textAlign: 'center' }}>
            {d}
          </Texto>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {celdas.map((dia, i) => {
          if (!dia) return <View key={`v${i}`} style={{ width: `${100 / 7}%`, height: ALTO_TOCABLE }} />;
          const futuro = dia > hoy;
          const extremo = dia === valor.desde || dia === valor.hasta;
          const dentro = !!valor.desde && !!valor.hasta && dia > valor.desde && dia < valor.hasta;
          return (
            <Pressable
              key={dia}
              accessibilityRole="button"
              accessibilityState={{ disabled: futuro, selected: extremo }}
              disabled={futuro}
              onPress={() => tocar(dia)}
              style={{ width: `${100 / 7}%`, height: ALTO_TOCABLE, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: extremo ? colores.accion : dentro ? colores.seleccionado : 'transparent',
                  opacity: futuro ? 0.35 : 1,
                }}>
                <Texto style={{ color: extremo ? colores.textoSobreAccion : colores.texto, fontFamily: extremo ? FUENTES.textoFuerte : FUENTES.texto }}>
                  {partes(dia).dia}
                </Texto>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export type { Periodo };
