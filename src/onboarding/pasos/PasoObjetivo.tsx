import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { NombreEmoji } from '@/components/emoji/Emoji';
import { Opcion } from '@/components/Opcion';
import type { Objetivo } from '@/lib/plan';
import { ESPACIO } from '@/theme';

import { EncabezadoPaso, type PropsPaso } from './comun';

const OBJETIVOS: { id: Objetivo; emoji: NombreEmoji }[] = [
  { id: 'ver', emoji: 'ojos' },
  { id: 'ahorro', emoji: 'alcancia' },
  { id: 'meta', emoji: 'diana' },
  { id: 'deudas', emoji: 'tarjeta' },
];

export function PasoObjetivo({ d, cambiar }: PropsPaso) {
  const { t } = useTranslation();
  return (
    <>
      <EncabezadoPaso
        titulo={d.uso === 'ambos' ? t('onboarding.objetivo.tituloAmbos') : t('onboarding.objetivo.titulo')}
        detalle={t('onboarding.objetivo.detalle')}
      />
      <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {OBJETIVOS.map((o) => (
          <Opcion
            key={o.id}
            emoji={o.emoji}
            titulo={t(`onboarding.objetivo.${o.id}.titulo`)}
            detalle={t(`onboarding.objetivo.${o.id}.detalle`)}
            elegida={d.objetivo === o.id}
            onPress={() => cambiar({ objetivo: o.id })}
          />
        ))}
      </View>
    </>
  );
}
