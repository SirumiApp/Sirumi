import { Text, type TextProps } from 'react-native';

import { FUENTES, TAMANOS, useTema } from '@/theme';

type Variante = 'titulo' | 'subtitulo' | 'cifra' | 'texto' | 'fuerte' | 'suave' | 'pequeno';

type Props = TextProps & { variante?: Variante; color?: string };

const ESTILOS: Record<Variante, { fontFamily: string; fontSize: number; lineHeight: number }> = {
  titulo: { fontFamily: FUENTES.titulo, fontSize: TAMANOS.titulo, lineHeight: 32 },
  subtitulo: { fontFamily: FUENTES.titulo, fontSize: TAMANOS.subtitulo, lineHeight: 24 },
  cifra: { fontFamily: FUENTES.titulo, fontSize: TAMANOS.cifra, lineHeight: 40 },
  texto: { fontFamily: FUENTES.texto, fontSize: TAMANOS.texto, lineHeight: 22 },
  fuerte: { fontFamily: FUENTES.textoFuerte, fontSize: TAMANOS.texto, lineHeight: 22 },
  suave: { fontFamily: FUENTES.texto, fontSize: TAMANOS.texto, lineHeight: 22 },
  pequeno: { fontFamily: FUENTES.texto, fontSize: TAMANOS.pequeno, lineHeight: 18 },
};

/** Texto con las fuentes y colores de la marca. */
export function Texto({ variante = 'texto', color, style, ...resto }: Props) {
  const { colores } = useTema();
  const colorBase = variante === 'suave' || variante === 'pequeno' ? colores.textoSuave : colores.texto;
  return <Text style={[ESTILOS[variante], { color: color ?? colorBase }, style]} {...resto} />;
}
