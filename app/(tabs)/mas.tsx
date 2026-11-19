import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { FilaAjuste } from '@/components/FilaAjuste';
import { GrupoAjustes } from '@/components/PantallaAjuste';
import { PantallaApp } from '@/components/PantallaApp';
import { Texto } from '@/components/Texto';
import { ESPACIO } from '@/theme';

/** Negocio · Más (spec 03, §5): informes y lo que arma el negocio. */
export default function Mas() {
  const { t } = useTranslation();
  return (
    <PantallaApp>
      <View style={{ gap: ESPACIO.xs, marginTop: ESPACIO.s }}>
        <Texto variante="titulo">{t('negocioApp.informes.titulo')}</Texto>
        <Texto variante="suave">{t('negocioApp.informes.detalle')}</Texto>
      </View>

      <GrupoAjustes>
        <FilaAjuste emoji="tienda" titulo={t('pos.historial.titulo')} detalle={t('pos.historial.detalle')} onPress={() => router.push('/pos/ventas')} />
        <FilaAjuste emoji="paquete" titulo={t('inventario.titulo')} detalle={t('inventario.detalle')} onPress={() => router.push('/inventario')} />
      </GrupoAjustes>

      <GrupoAjustes titulo={t('negocioApp.informes.grupoInformes')}>
        <FilaAjuste emoji="balanza" titulo={t('negocioApp.informes.balance')} detalle={t('negocioApp.informes.balanceDetalle')} onPress={() => router.push('/informe/balance')} />
        <FilaAjuste emoji="portapapeles" titulo={t('negocioApp.informes.cartera')} detalle={t('negocioApp.informes.carteraDetalle')} onPress={() => router.push('/informe/cartera')} />
        <FilaAjuste emoji="empresaria" titulo={t('negocioApp.informes.dueno')} detalle={t('negocioApp.informes.duenoDetalle')} onPress={() => router.push('/informe/dueno')} />
        <FilaAjuste emoji="recibo" titulo={t('negocioApp.informes.cierre.titulo')} detalle={t('negocioApp.informes.cierre.detalle')} onPress={() => router.push('/informe/cierre')} />
        <FilaAjuste emoji="cambio" titulo={t('negocioApp.informes.entradas')} detalle={t('negocioApp.informes.entradasDetalle')} onPress={() => router.push('/informe/entradas')} />
      </GrupoAjustes>

      <GrupoAjustes titulo={t('negocioApp.informes.grupoNegocio')}>
        <FilaAjuste emoji="cohete" titulo={t('negocioApp.informes.arranque')} detalle={t('negocioApp.informes.arranqueDetalle')} onPress={() => router.push('/arranque')} />
        <FilaAjuste emoji="apreton-de-manos" titulo={t('negocioApp.informes.clientes')} detalle={t('contactos.detalle')} onPress={() => router.push('/contactos')} />
        <FilaAjuste emoji="repetir" titulo={t('negocioApp.informes.recurrentes')} detalle={t('recurrentes.detalle')} onPress={() => router.push('/recurrentes')} />
      </GrupoAjustes>
    </PantallaApp>
  );
}
