import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { COLORES_GRAFICA, ESPACIO, FUENTES, useTema } from '@/theme';

import { Texto } from './Texto';

export type PuntoMes = { etiqueta: string; gasto: number; ingreso: number };

type Props = {
  meses: PuntoMes[];
  textos: { gastos: string; ingresos: string };
  /** Cifra corta encima de cada barra ("4,38M"). */
  corto: (valor: number) => string;
  /** Texto completo del mes elegido (cifras exactas). */
  detalle: (mes: PuntoMes) => string;
};

const ALTO = 150;
const ARRIBA = 22; // espacio para las cifras encima de las barras
const ANCHO_BARRA = 0.7; // fracción de la columna

/**
 * Gastos por mes (barras; el mes actual resaltado) con la línea punteada de ingresos, en la misma escala (un solo eje).
 * Como en el prototipo: cifra corta encima de cada barra. Tocar un mes muestra sus cifras exactas.
 */
export function GraficaMeses({ meses, textos, corto, detalle }: Props) {
  const { colores, oscuro } = useTema();
  const paleta = oscuro ? COLORES_GRAFICA.oscuro : COLORES_GRAFICA.claro;
  const ultimo = meses.length - 1;
  const [elegido, setElegido] = useState(ultimo);
  const [ancho, setAncho] = useState(0);

  const maximo = Math.max(1, ...meses.map((m) => Math.max(m.gasto, m.ingreso)));
  const columna = ancho / Math.max(1, meses.length);
  const y = (valor: number) => ARRIBA + (ALTO - ARRIBA) - (valor / maximo) * (ALTO - ARRIBA - 4);
  const hayIngresos = meses.some((m) => m.ingreso > 0);
  const puntos = meses.map((m, i) => `${columna * i + columna / 2},${y(m.ingreso)}`).join(' ');
  const mesElegido = meses[Math.min(elegido, ultimo)];

  return (
    <View style={{ gap: ESPACIO.s }}>
      <View style={{ height: ALTO + 2 }} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        {ancho > 0 && (
          <Svg width={ancho} height={ALTO + 2}>
            {meses.map((m, i) => {
              const alto = Math.max(m.gasto > 0 ? 6 : 0, ALTO - y(m.gasto));
              const anchoBarra = columna * ANCHO_BARRA;
              return (
                <Rect
                  key={`b${i}`}
                  x={columna * i + (columna - anchoBarra) / 2}
                  y={ALTO - alto}
                  width={anchoBarra}
                  height={alto}
                  rx={6}
                  fill={i === ultimo || i === elegido ? paleta.gasto : paleta.gastoSuave}
                />
              );
            })}
            {hayIngresos && <Polyline points={puntos} fill="none" stroke={paleta.ingreso} strokeWidth={2} strokeDasharray="6 5" />}
            {hayIngresos &&
              meses.map((m, i) => (
                <Circle key={`p${i}`} cx={columna * i + columna / 2} cy={y(m.ingreso)} r={4} fill={paleta.ingreso} stroke={colores.tarjeta} strokeWidth={2} />
              ))}
            <Line x1={0} y1={ALTO + 1} x2={ancho} y2={ALTO + 1} stroke={colores.borde} strokeWidth={1} />
          </Svg>
        )}
        {/* Cifras cortas encima de cada barra */}
        {ancho > 0 &&
          meses.map((m, i) =>
            m.gasto > 0 ? (
              <Texto
                key={`c${i}`}
                style={{
                  position: 'absolute',
                  left: columna * i,
                  width: columna,
                  top: Math.max(0, ALTO - Math.max(6, ALTO - y(m.gasto)) - 19),
                  textAlign: 'center',
                  fontFamily: FUENTES.textoFuerte,
                  fontSize: 11,
                  lineHeight: 15,
                }}
                color={i === elegido ? colores.texto : colores.textoSuave}>
                {corto(m.gasto)}
              </Texto>
            ) : null,
          )}
        {/* Zonas para tocar, más grandes que las barras */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
          {meses.map((m, i) => (
            <Pressable
              key={`t${i}`}
              accessibilityRole="button"
              accessibilityLabel={detalle(m)}
              accessibilityState={{ selected: i === elegido }}
              onPress={() => setElegido(i)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {meses.map((m, i) => (
          <Texto
            key={`e${i}`}
            style={{ flex: 1, textAlign: 'center', fontFamily: FUENTES.textoFuerte, fontSize: 12, lineHeight: 16 }}
            color={i === elegido ? colores.texto : colores.textoSuave}>
            {m.etiqueta.replace(/^./, (l) => l.toUpperCase())}
          </Texto>
        ))}
      </View>

      {mesElegido && (
        <Texto variante="pequeno" accessibilityLiveRegion="polite">
          {detalle(mesElegido)}
        </Texto>
      )}

      {/* Leyenda: con dos series, siempre visible */}
      <View style={{ flexDirection: 'row', gap: ESPACIO.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.xs }}>
          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: paleta.gasto }} />
          <Texto variante="pequeno">{textos.gastos}</Texto>
        </View>
        {hayIngresos && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.xs }}>
            <Svg width={22} height={10}>
              <Line x1={0} y1={5} x2={22} y2={5} stroke={paleta.ingreso} strokeWidth={2} strokeDasharray="5 4" />
            </Svg>
            <Texto variante="pequeno">{textos.ingresos}</Texto>
          </View>
        )}
      </View>
    </View>
  );
}
