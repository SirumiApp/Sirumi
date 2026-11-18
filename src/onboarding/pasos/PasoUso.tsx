import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { Opcion } from '@/components/Opcion';
import { ESPACIO } from '@/theme';

import type { Uso } from '../camino';
import { incluyeNegocio } from '../datos';
import { EncabezadoPaso, type PropsPaso } from './comun';

const USOS: { id: Uso; emoji: 'monedero' | 'tienda' | 'destellos' }[] = [
  { id: 'personal', emoji: 'monedero' },
  { id: 'negocio', emoji: 'tienda' },
  { id: 'ambos', emoji: 'destellos' },
];

export function PasoUso({ d, cambiar }: PropsPaso) {
  const { t } = useTranslation();
  return (
    <>
      <EncabezadoPaso titulo={t('onboarding.uso.titulo')} detalle={t('onboarding.uso.detalle')} />
      <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {USOS.map((u) => (
          <Opcion
            key={u.id}
            emoji={u.emoji}
            titulo={t(`onboarding.uso.${u.id}.titulo`)}
            detalle={t(`onboarding.uso.${u.id}.detalle`)}
            elegida={d.uso === u.id}
            onPress={() => cambiar({ uso: u.id })}
          />
        ))}
      </View>
      {incluyeNegocio(d) && (
        <CampoTexto
          etiqueta={t('onboarding.uso.nombreNegocio')}
          value={d.negocio}
          onChangeText={(negocio) => cambiar({ negocio })}
          autoCapitalize="sentences"
          ayuda={t('onboarding.uso.nombreNegocioAyuda')}
        />
      )}
    </>
  );
}
