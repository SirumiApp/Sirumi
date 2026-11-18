import { useTranslation } from 'react-i18next';

import { PantallaVacia } from '@/components/PantallaVacia';

/** Negocio · pantalla que llega con el módulo de negocio (docs/specs/03-negocio.md). */
export default function Pantalla() {
  const { t } = useTranslation();
  return (
    <PantallaVacia
      saludo={t('negocio.saludo')}
      titulo={t('navegacion.mas')}
      emoji="tienda"
      mensaje={t('navegacion.muyPronto')}
      detalle={t('negocio.detalle')}
    />
  );
}
