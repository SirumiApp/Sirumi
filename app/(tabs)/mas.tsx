import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { FilaAjuste } from '@/components/FilaAjuste';
import { useTributario } from '@/impuestos/ganchos';
import { GrupoAjustes } from '@/components/PantallaAjuste';
import { PantallaApp } from '@/components/PantallaApp';
import { Texto } from '@/components/Texto';
import { ESPACIO } from '@/theme';
import { SoloSi } from '@/components/SoloSi';

/** Negocio · Más (spec 03, §5): informes y lo que arma el negocio. */
function MasContenido() {
  const { t } = useTranslation();
  const { colombia } = useTributario();
  return (
    <PantallaApp>
      <View style={{ gap: ESPACIO.xs, marginTop: ESPACIO.s }}>
        <Texto variante="titulo">{t('negocioApp.informes.titulo')}</Texto>
        <Texto variante="suave">{t('negocioApp.informes.detalle')}</Texto>
      </View>

      <GrupoAjustes>
        <FilaAjuste emoji="grafico-de-barras" titulo={t('informeVentas.titulo')} detalle={t('informeVentas.detalle')} onPress={() => router.push('/informe-ventas')} />
        <FilaAjuste emoji="etiqueta" titulo={t('codigos.titulo')} detalle={t('codigos.detalle')} onPress={() => router.push('/codigos')} />
        <FilaAjuste emoji="persona" titulo={t('vendedores.titulo')} detalle={t('vendedores.detalle')} onPress={() => router.push('/vendedores')} />
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
        <FilaAjuste emoji="banco" titulo={t('extractos.entrada')} detalle={t('extractos.entradaDetalle')} onPress={() => router.push('/extractos?ambito=negocio')} />
        {colombia && <FilaAjuste emoji="calendario" titulo={t('impuestos.titulo')} detalle={t('impuestos.entradaDetalle')} onPress={() => router.push('/impuestos')} />}
      </GrupoAjustes>
    </PantallaApp>
  );
}

export default function Mas() {
  return (
    <SoloSi parte="negocio" soloDueno>
      <MasContenido />
    </SoloSi>
  );
}
