import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Emoji } from '@/components/emoji/Emoji';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { ESPACIO, useTema } from '@/theme';

import { incluyeNegocio, incluyePersonal, planDelOnboarding } from '../datos';
import { formatearMontoPais, paisPorCodigo } from '../paises';
import type { PropsPaso } from './comun';

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const { colores } = useTema();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: ESPACIO.m,
        paddingVertical: ESPACIO.s,
        borderBottomWidth: 1,
        borderBottomColor: colores.borde,
      }}>
      <Texto variante="suave">{etiqueta}</Texto>
      <Texto variante="fuerte" style={{ flexShrink: 1, textAlign: 'right' }}>
        {valor}
      </Texto>
    </View>
  );
}

export function PasoListo({ d }: Pick<PropsPaso, 'd'>) {
  const { t } = useTranslation();
  const pais = paisPorCodigo(d.pais);
  const conPlan = incluyePersonal(d) && d.objetivo !== 'ver';
  const plan = planDelOnboarding(d);

  return (
    <>
      <View style={{ alignItems: 'center', gap: ESPACIO.s, paddingTop: ESPACIO.l }}>
        <Emoji name="confeti" size={96} />
        <Texto variante="titulo" accessibilityRole="header">
          {t('onboarding.listo.titulo')}
        </Texto>
        <Texto variante="suave">{t('onboarding.listo.detalle')}</Texto>
      </View>
      <Tarjeta style={{ gap: 0 }}>
        <Fila etiqueta={t('onboarding.listo.pais')} valor={`${pais.bandera} ${t(`paises.${pais.codigo}`)}`} />
        <Fila etiqueta={t('onboarding.listo.moneda')} valor={pais.moneda} />
        <Fila etiqueta={t('onboarding.listo.uso')} valor={t(`onboarding.listo.usos.${d.uso}`)} />
        {incluyeNegocio(d) && (
          <Fila etiqueta={t('onboarding.listo.negocio')} valor={d.negocio.trim() || t('onboarding.porDefecto.negocio')} />
        )}
        {conPlan && (
          <Fila
            etiqueta={d.objetivo === 'ahorro' ? t('onboarding.listo.gastoMaximo') : t('onboarding.listo.teQueda')}
            valor={formatearMontoPais(plan.disponible, pais)}
          />
        )}
      </Tarjeta>
    </>
  );
}
