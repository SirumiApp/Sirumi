import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { ALTO_TOCABLE, ESPACIO, FUENTES, useTema } from '@/theme';

import { Emoji, type NombreEmoji } from './emoji/Emoji';
import { Icono } from './Icono';
import { Texto } from './Texto';

type Props = {
  emoji?: NombreEmoji;
  /** Para lo que no es un emoji 3D (por ejemplo, una bandera). */
  izquierda?: ReactNode;
  titulo: string;
  detalle?: string;
  /** Etiqueta pequeña a la derecha (por ejemplo "Activo"). */
  insignia?: string;
  /** Lo que va a la derecha en lugar de la flecha (por ejemplo, un interruptor). */
  derecha?: ReactNode;
  onPress?: () => void;
};

/** Fila de Ajustes: emoji en cuadro suave, título y detalle, y una flecha o un control a la derecha. */
export function FilaAjuste({ emoji, izquierda, titulo, detalle, insignia, derecha, onPress }: Props) {
  const { colores } = useTema();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: ESPACIO.s + 4,
        minHeight: ALTO_TOCABLE + 20,
        paddingVertical: ESPACIO.s,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.seleccionado }}>
        {izquierda ?? (emoji ? <Emoji name={emoji} size={26} /> : null)}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 21 }}>{titulo}</Texto>
        {detalle ? <Texto variante="pequeno">{detalle}</Texto> : null}
      </View>
      {insignia ? (
        <View style={{ paddingHorizontal: ESPACIO.s + 2, paddingVertical: 3, borderRadius: 999, backgroundColor: colores.seleccionado }}>
          <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={colores.enlace}>
            {insignia}
          </Texto>
        </View>
      ) : null}
      {derecha ?? (onPress ? <Icono nombre="adelante" tamano={18} color={colores.textoSuave} /> : null)}
    </Pressable>
  );
}
