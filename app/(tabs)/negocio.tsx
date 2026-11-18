import { useTranslation } from 'react-i18next';

import { PantallaVacia } from '@/components/PantallaVacia';

export default function NegocioPantalla() {
  const { t } = useTranslation();
  return (
    <PantallaVacia
      saludo={t('negocio.saludo')}
      titulo={t('negocio.titulo')}
      emoji="tienda"
      mensaje={t('negocio.mensaje')}
      detalle={t('negocio.detalle')}
    />
  );
}
