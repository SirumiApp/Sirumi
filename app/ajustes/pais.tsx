import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { actualizarPerfil, usePerfil } from '@/auth/perfil';
import { useSesion } from '@/auth/sesion';
import { Opcion } from '@/components/Opcion';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Texto } from '@/components/Texto';
import { formatearMontoPais, PAISES } from '@/onboarding/paises';
import { ESPACIO } from '@/theme';

/** Ajustes · País y moneda (los mismos 10 países del onboarding). Solo cambia cómo se muestran los montos. */
export default function Pais() {
  const { t } = useTranslation();
  const { sesion } = useSesion();
  const perfil = usePerfil();
  const actual = perfil?.country ?? 'CO';

  return (
    <PantallaAjuste titulo={t('paisAjustes.titulo')} detalle={t('paisAjustes.detalle')}>
      <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {PAISES.map((p) => (
          <Opcion
            key={p.codigo}
            izquierda={<Texto style={{ fontSize: 28, lineHeight: 34 }}>{p.bandera}</Texto>}
            titulo={t(`paises.${p.codigo}`)}
            detalle={formatearMontoPais(1_250_000, p)}
            derecha={p.moneda}
            elegida={actual === p.codigo}
            onPress={() => sesion && actualizarPerfil(sesion.user.id, { country: p.codigo, currency: p.moneda })}
          />
        ))}
      </View>
    </PantallaAjuste>
  );
}
