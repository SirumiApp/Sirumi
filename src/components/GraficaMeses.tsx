import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { COLORES_GRAFICA, ESPACIO, useTema } from '@/theme';

import { Texto } from './Texto';

export type PuntoMes = { etiqueta: string; gasto: number; ingreso: number };

type Props = {
  meses: PuntoMes[];
  textos: { gastos: string; ingresos: string };
  /** Texto del mes elegido (cifras exactas); se muestra arriba de la gráfica. */
  detalle: (mes: PuntoMes) => string;
};

const ALTO = 160;
const ANCHO_BARRA = 0.42; // fracción de la columna

/**
 * Barras de gastos por mes con la línea de ingresos encima (misma escala de plata: un solo eje).
 * Tocar un mes muestra sus cifras; la leyenda nombra las dos series para no depender solo del color.
 */
export function GraficaMeses({ meses, textos, detalle }: Props) {
  const { colores, oscuro } = useTema();
  const paleta = oscuro ? COLORES_GRAFICA.oscuro : COLORES_GRAFICA.claro;
  const [elegido, setElegido] = useState(meses.length - 1);
  const [ancho, setAncho] = useState(0);

  const maximo = Math.max(1, ...meses.map((m) => Math.max(m.gasto, m.ingreso)));
  const columna = ancho / Math.max(1, meses.length);
  const y = (valor: number) => ALTO - (valor / maximo) * (ALTO - 8);
  const hayIngresos = meses.some((m) => m.ingreso > 0);
  const puntos = meses.map((m, i) => `${columna * i + columna / 2},${y(m.ingreso)}`).join(' ');
  const mesElegido = meses[Math.min(elegido, meses.length - 1)];

  return (
    <View style={{ gap: ESPACIO.s }}>
      {/* Leyenda: siempre visible con dos series */}
      <View style={{ flexDirection: 'row', gap: ESPACIO.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.xs }}>
          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: paleta.gasto }} />
          <Texto variante="pequeno">{textos.gastos}</Texto>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.xs }}>
          <View style={{ width: 16, height: 2, backgroundColor: paleta.ingreso }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: paleta.ingreso, marginLeft: -12 }} />
          <Texto variante="pequeno">{textos.ingresos}</Texto>
        </View>
      </View>

      {mesElegido && (
        <Texto variante="fuerte" accessibilityLiveRegion="polite">
          {detalle(mesElegido)}
        </Texto>
      )}

      <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)} style={{ height: ALTO }}>
        {ancho > 0 && (
          <Svg width={ancho} height={ALTO}>
            <Line x1={0} y1={ALTO - 0.5} x2={ancho} y2={ALTO - 0.5} stroke={colores.borde} strokeWidth={1} />
            {meses.map((m, i) => {
              const alto = Math.max(m.gasto > 0 ? 4 : 0, ALTO - y(m.gasto));
              const anchoBarra = columna * ANCHO_BARRA;
              return (
                <Rect
                  key={m.etiqueta + i}
                  x={columna * i + (columna - anchoBarra) / 2}
                  y={ALTO - alto}
                  width={anchoBarra}
                  height={alto}
                  rx={4}
                  fill={paleta.gasto}
                  opacity={i === elegido ? 1 : 0.55}
                />
              );
            })}
            {hayIngresos && <Polyline points={puntos} fill="none" stroke={paleta.ingreso} strokeWidth={2} />}
            {hayIngresos &&
              meses.map((m, i) => (
                <Circle key={`p${i}`} cx={columna * i + columna / 2} cy={y(m.ingreso)} r={4.5} fill={paleta.ingreso} stroke={colores.tarjeta} strokeWidth={2} />
              ))}
          </Svg>
        )}
        {/* Zonas para tocar, más grandes que las barras */}
        <View style={{ position: 'absolute', inset: 0, flexDirection: 'row' }}>
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
          <Texto key={`e${i}`} variante="pequeno" style={{ flex: 1, textAlign: 'center' }} color={i === elegido ? colores.texto : undefined}>
            {m.etiqueta}
          </Texto>
        ))}
      </View>
    </View>
  );
}
