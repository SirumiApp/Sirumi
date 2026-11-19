import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { Texto } from '@/components/Texto';
import { useNegocio } from '@/negocio/contexto';
import { usePlata } from '@/personal/ganchos';
import { ESPACIO, useTema } from '@/theme';

import { descartarPendiente, reintentarRechazadas, subirPendientes, useVentasPendientes } from './cola';

/** En el POS: cuántas ventas están guardadas sin internet, subirlas ya y revisar las que el servidor rechazó. */
export function BannerPendientes() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const { negocio, actualizar } = useNegocio();
  const pendientes = useVentasPendientes(negocio?.id);
  const [subiendo, setSubiendo] = useState(false);
  if (pendientes.length === 0) return null;
  const rechazadas = pendientes.filter((v) => v.error);
  const porSubir = pendientes.length - rechazadas.length;
  const total = pendientes.reduce((s, v) => s + v.comprobante.total, 0);

  async function subir() {
    setSubiendo(true);
    const n = rechazadas.length ? await reintentarRechazadas() : await subirPendientes();
    setSubiendo(false);
    if (n > 0) actualizar();
    else Alert.alert(t('pos.sinInternet.sigueSinSenal'));
  }

  function descartar(clientId: string) {
    Alert.alert(t('pos.sinInternet.descartar'), t('pos.sinInternet.descartarDetalle'), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      { text: t('pos.sinInternet.siDescartar'), style: 'destructive', onPress: () => descartarPendiente(clientId) },
    ]);
  }

  return (
    <View style={{ gap: ESPACIO.s, padding: ESPACIO.m, borderRadius: 16, backgroundColor: colores.avisoFondo }} accessibilityRole="alert">
      <View style={{ flexDirection: 'row', gap: ESPACIO.s, alignItems: 'center' }}>
        <Emoji name="nube" size={28} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="fuerte" color={colores.avisoTexto}>
            {t('pos.sinInternet.porSubir', { count: pendientes.length, monto: plata(total) })}
          </Texto>
          {porSubir > 0 && (
            <Texto variante="pequeno" color={colores.avisoTexto}>
              {t('pos.sinInternet.seSuben')}
            </Texto>
          )}
        </View>
      </View>
      {rechazadas.map((v) => (
        <View key={v.clientId} style={{ gap: 2 }}>
          <Texto variante="pequeno" color={colores.errorTexto}>
            {t('pos.sinInternet.rechazada', { monto: plata(v.comprobante.total), motivo: v.error ?? '' })}
          </Texto>
          <Boton titulo={t('pos.sinInternet.descartar')} variante="texto" onPress={() => descartar(v.clientId)} />
        </View>
      ))}
      <Boton titulo={t('pos.sinInternet.subirYa')} variante="secundario" cargando={subiendo} onPress={subir} />
    </View>
  );
}
