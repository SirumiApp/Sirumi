import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ESPACIO } from '@/theme';

import { Emoji, type NombreEmoji } from './emoji/Emoji';
import { Logo } from './Logo';
import { Pantalla } from './Pantalla';
import { SelectorIdioma } from './SelectorIdioma';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

type Props = {
  saludo: string;
  titulo: string;
  emoji: NombreEmoji;
  mensaje: string;
  detalle: string;
  /** Contenido extra al final de la pantalla. */
  children?: ReactNode;
};

/** Pantalla de una sección que aún no tiene contenido, con la marca de Sirumi. */
export function PantallaVacia({ saludo, titulo, emoji, mensaje, detalle, children }: Props) {
  const { t } = useTranslation();
  return (
    <Pantalla>
      <Logo />
      {/* El idioma siempre a la vista (a la izquierda: arriba a la derecha lo tapa el botón de Expo Go). */}
      <SelectorIdioma />
      <View style={{ gap: ESPACIO.xs, marginTop: ESPACIO.s }}>
        <Texto variante="suave">{saludo}</Texto>
        <Texto variante="titulo">{titulo}</Texto>
      </View>
      <Tarjeta style={{ alignItems: 'center', paddingVertical: ESPACIO.xl }}>
        <Emoji name={emoji} size={72} />
        <Texto variante="subtitulo" style={{ textAlign: 'center', marginTop: ESPACIO.s }}>
          {mensaje}
        </Texto>
        <Texto variante="suave" style={{ textAlign: 'center' }}>
          {detalle}
        </Texto>
      </Tarjeta>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESPACIO.s }}>
        <Emoji name="grafica-que-sube" size={20} />
        <Texto variante="pequeno">{t('comun.lema')}</Texto>
      </View>
      {children}
    </Pantalla>
  );
}
