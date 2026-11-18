import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import type { NombreEmoji } from '@/components/emoji/Emoji';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { ESPACIO, useTema } from '@/theme';

import { MESES_META, planDelOnboarding } from '../datos';
import { formatearMontoPais, paisPorCodigo } from '../paises';
import { EncabezadoPaso, type PropsPaso } from './comun';

const EMOJIS: Record<'ahorro' | 'deudas' | 'meta', NombreEmoji> = { ahorro: 'alcancia', deudas: 'tarjeta', meta: 'diana' };

export function PasoPlan({ d, cambiar, intentado }: PropsPaso) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const pais = paisPorCodigo(d.pais);
  const plata = (n: number) => formatearMontoPais(n, pais);
  const plan = planDelOnboarding(d);
  const mensajeError = plan.error ? t(`errores.${plan.error}`) : null;

  const errorIngreso = intentado && d.ingreso <= 0 ? mensajeError : null;
  const errorMonto = intentado && d.ingreso > 0 ? mensajeError : null;

  const objetivo = d.objetivo === 'ver' ? 'ahorro' : d.objetivo;
  const linea1 =
    objetivo === 'ahorro'
      ? t('onboarding.plan.ahorro.linea1', { ingreso: plata(d.ingreso), monto: plata(d.ahorro) })
      : objetivo === 'deudas'
        ? t('onboarding.plan.deudas.linea1', { ingreso: plata(d.ingreso), monto: plata(d.abono) })
        : t('onboarding.plan.meta.linea1', { valor: plata(d.metaValor), meses: d.metaMeses, monto: plata(plan.separar) });

  return (
    <>
      <EncabezadoPaso
        emoji={EMOJIS[objetivo]}
        titulo={t(`onboarding.plan.${objetivo}.titulo`)}
        detalle={t(`onboarding.plan.${objetivo}.detalle`)}
      />

      <CampoDinero
        etiqueta={t('onboarding.plan.ingreso')}
        valor={d.ingreso}
        onCambio={(ingreso) => cambiar({ ingreso })}
        separador={pais.separador}
        error={errorIngreso}
      />

      {objetivo === 'ahorro' && (
        <CampoDinero
          etiqueta={t('onboarding.plan.ahorro.campo')}
          valor={d.ahorro}
          onCambio={(ahorro) => cambiar({ ahorro })}
          separador={pais.separador}
          error={errorMonto}
        />
      )}
      {objetivo === 'deudas' && (
        <CampoDinero
          etiqueta={t('onboarding.plan.deudas.campo')}
          valor={d.abono}
          onCambio={(abono) => cambiar({ abono })}
          separador={pais.separador}
          error={errorMonto}
        />
      )}
      {objetivo === 'meta' && (
        <>
          <CampoTexto
            etiqueta={t('onboarding.plan.meta.campoNombre')}
            value={d.metaNombre}
            onChangeText={(metaNombre) => cambiar({ metaNombre })}
            placeholder={t('onboarding.plan.meta.ejemploNombre')}
            autoCapitalize="sentences"
          />
          <CampoDinero
            etiqueta={t('onboarding.plan.meta.campoValor')}
            valor={d.metaValor}
            onCambio={(metaValor) => cambiar({ metaValor })}
            separador={pais.separador}
            error={errorMonto}
          />
          <View style={{ gap: ESPACIO.s }}>
            <Texto variante="fuerte">{t('onboarding.plan.meta.campoMeses')}</Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
              {MESES_META.map((m) => (
                <Chip key={m} texto={t('onboarding.plan.meses', { n: m })} elegido={d.metaMeses === m} onPress={() => cambiar({ metaMeses: m })} />
              ))}
            </View>
          </View>
        </>
      )}

      {!plan.error && (
        <Tarjeta style={{ borderColor: colores.marca, borderWidth: 2 }}>
          <Texto variante="pequeno" style={{ letterSpacing: 1 }}>
            {t('onboarding.plan.tuPlan')}
          </Texto>
          <Texto>{linea1}</Texto>
          <Texto variante="cifra">{plata(plan.disponible)}</Texto>
          <Texto variante="suave">{t(`onboarding.plan.${objetivo}.linea2`)}</Texto>
        </Tarjeta>
      )}
    </>
  );
}
