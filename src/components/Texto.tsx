import { Text, type TextProps } from 'react-native';

import { FUENTES, TAMANOS, useTema } from '@/theme';

type Variante = 'heroe' | 'titulo' | 'subtitulo' | 'cifra' | 'texto' | 'medio' | 'fuerte' | 'suave' | 'pequeno' | 'etiqueta';

type Props = TextProps & { variante?: Variante; color?: string };

const ESTILOS: Record<Variante, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }> = {
  heroe: { fontFamily: FUENTES.titulo, fontSize: TAMANOS.heroe, lineHeight: 54, letterSpacing: -1.5 },
  titulo: { fontFamily: FUENTES.titulo, fontSize: TAMANOS.titulo, lineHeight: 34, letterSpacing: -0.6 },
  subtitulo: { fontFamily: FUENTES.titulo, fontSize: TAMANOS.subtitulo, lineHeight: 25, letterSpacing: -0.3 },
  cifra: { fontFamily: FUENTES.titulo, fontSize: TAMANOS.cifra, lineHeight: 38, letterSpacing: -0.8 },
  texto: { fontFamily: FUENTES.texto, fontSize: TAMANOS.texto, lineHeight: 22 },
  medio: { fontFamily: FUENTES.textoMedio, fontSize: TAMANOS.texto, lineHeight: 22 },
  fuerte: { fontFamily: FUENTES.textoFuerte, fontSize: TAMANOS.texto, lineHeight: 22 },
  suave: { fontFamily: FUENTES.texto, fontSize: TAMANOS.texto, lineHeight: 22 },
  pequeno: { fontFamily: FUENTES.texto, fontSize: TAMANOS.pequeno, lineHeight: 18 },
  /** Texto chiquito en negrita (encima de un valor: "Ingresos", "Plan de ahorro"). */
  etiqueta: { fontFamily: FUENTES.textoMedio, fontSize: 13, lineHeight: 17 },
};

/** Texto con las fuentes y colores de la marca. */
export function Texto({ variante = 'texto', color, style, ...resto }: Props) {
  const { colores } = useTema();
  const suave = variante === 'suave' || variante === 'pequeno' || variante === 'etiqueta';
  return <Text style={[ESTILOS[variante], { color: color ?? (suave ? colores.textoSuave : colores.texto) }, style]} {...resto} />;
}
