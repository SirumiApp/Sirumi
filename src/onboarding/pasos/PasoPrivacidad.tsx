import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Casilla } from '@/components/Casilla';
import { Texto } from '@/components/Texto';
import { ESPACIO } from '@/theme';

import type { Consentimientos } from '../datos';
import { EncabezadoPaso, type PropsPaso } from './comun';
import { ModalPolitica, type TipoPolitica } from './ModalPolitica';

const CASILLAS: { clave: keyof Consentimientos; obligatoria: boolean }[] = [
  { clave: 'terminos', obligatoria: true },
  { clave: 'datos', obligatoria: true },
  { clave: 'ia', obligatoria: false },
  { clave: 'novedades', obligatoria: false },
];

export function faltanObligatorias(c: Consentimientos): boolean {
  return !c.terminos || !c.datos;
}

export function PasoPrivacidad({ d, cambiar, intentado }: PropsPaso) {
  const { t } = useTranslation();
  const [politica, setPolitica] = useState<TipoPolitica | null>(null);
  const c = d.consentimientos;

  return (
    <>
      <EncabezadoPaso emoji="candado" titulo={t('onboarding.privacidad.titulo')} detalle={t('onboarding.privacidad.detalle')} />

      <View style={{ gap: ESPACIO.xs }}>
        <Boton titulo={t('onboarding.privacidad.leerColombia')} variante="texto" onPress={() => setPolitica('co')} />
        <Boton titulo={t('onboarding.privacidad.leerInternacional')} variante="texto" onPress={() => setPolitica('int')} />
        <Texto variante="pequeno" style={{ textAlign: 'center' }}>
          {t('onboarding.privacidad.borrador')}
        </Texto>
      </View>

      <View style={{ gap: ESPACIO.s }}>
        {CASILLAS.map((casilla) => (
          <Casilla
            key={casilla.clave}
            titulo={t(`onboarding.privacidad.casillas.${casilla.clave}.titulo`)}
            detalle={t(`onboarding.privacidad.casillas.${casilla.clave}.detalle`)}
            marcada={c[casilla.clave]}
            conError={intentado && casilla.obligatoria && !c[casilla.clave]}
            onPress={() => cambiar({ consentimientos: { ...c, [casilla.clave]: !c[casilla.clave] } })}
          />
        ))}
      </View>

      {intentado && faltanObligatorias(c) && <Aviso mensaje={t('errores.faltanAutorizaciones')} />}

      <ModalPolitica abierta={politica} onCerrar={() => setPolitica(null)} />
    </>
  );
}
