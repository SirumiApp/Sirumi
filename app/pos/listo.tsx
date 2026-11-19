import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Share, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { Texto } from '@/components/Texto';
import { useNegocio } from '@/negocio/contexto';
import { usePlata } from '@/personal/ganchos';
import { usePos } from '@/pos/contexto';
import { PantallaPos } from '@/pos/PantallaPos';
import { textoRecibo } from '@/pos/recibo';
import { VistaComprobante } from '@/pos/VistaComprobante';
import { COLOR_VENTA, ESPACIO, PALETA, useTema } from '@/theme';

/** Sirumi POS · Venta lista (spec 05, §3): banner verde, comprobante, compartir, recibo de regalo y nueva venta. */
export default function Listo() {
  const { t } = useTranslation();
  const { oscuro } = useTema();
  const plata = usePlata();
  const { negocio } = useNegocio();
  const pos = usePos();
  const c = pos.comprobante;

  function nueva() {
    pos.nuevaVenta();
    router.replace('/pos');
  }

  async function compartir(regalo: boolean) {
    if (!c) return;
    const texto = textoRecibo(c, negocio?.nombre ?? 'Sirumi', t, plata, regalo);
    // Con el celular del cliente, abre WhatsApp directo a su chat; si no, el menú de compartir del celular.
    const numero = c.celularCliente?.replace(/\D/g, '');
    if (numero && numero.length >= 10) {
      const url = `https://wa.me/${numero.length === 10 ? `57${numero}` : numero}?text=${encodeURIComponent(texto)}`;
      return Linking.openURL(url).catch(() => Share.share({ message: texto }));
    }
    await Share.share({ message: texto });
  }

  if (!c) {
    return (
      <PantallaPos titulo={t('pos.vender')} onAtras={nueva}>
        <Boton titulo={t('pos.nuevaVenta')} onPress={nueva} />
      </PantallaPos>
    );
  }

  return (
    <PantallaPos titulo={t('pos.comprobante')} onAtras={nueva}>
      <View style={{ alignItems: 'center', gap: ESPACIO.s, padding: ESPACIO.l, borderRadius: 24, backgroundColor: oscuro ? COLOR_VENTA.oscuro : COLOR_VENTA.claro }} accessibilityRole="alert">
        <Emoji name="confeti" size={56} />
        <Texto variante="titulo" color={PALETA.blanco} style={{ textAlign: 'center' }}>
          {t('pos.listo', { monto: plata(c.total) })}
        </Texto>
        <Texto color={PALETA.blanco} style={{ textAlign: 'center' }}>
          {t('pos.pagoCon', { forma: c.pagos.map((p) => p.nombre).join(' + ') })}
          {c.vuelto ? ` · ${t('pos.vuelto', { monto: plata(c.vuelto) })}` : ''}
        </Texto>
      </View>
      <VistaComprobante c={c} />
      <Boton titulo={t('pos.compartir')} variante="secundario" onPress={() => compartir(false)} />
      <Boton titulo={t('pos.regalo')} variante="secundario" onPress={() => compartir(true)} />
      <Boton titulo={t('pos.nuevaVenta')} onPress={nueva} />
    </PantallaPos>
  );
}
