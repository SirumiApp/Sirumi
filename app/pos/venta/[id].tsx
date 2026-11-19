import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Texto } from '@/components/Texto';
import { numeroVenta } from '@/lib/pos';
import { useNegocio } from '@/negocio/contexto';
import { leerErrorInventario } from '@/negocio/inventarioDatos';
import { usePlata } from '@/personal/ganchos';
import type { Comprobante } from '@/pos/contexto';
import { devolverVenta } from '@/pos/datos';
import { PantallaPos } from '@/pos/PantallaPos';
import { textoRecibo } from '@/pos/recibo';
import { VistaComprobante } from '@/pos/VistaComprobante';
import { useTema } from '@/theme';

/** Detalle de una venta (spec 05, §4): comprobante, reenviar y devolver (D4). */
export default function DetalleVenta() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { negocio, ventas, contactos, bodegas, actualizar } = useNegocio();
  const [error, setError] = useState<string | null>(null);
  const [devolviendo, setDevolviendo] = useState(false);
  const v = ventas.find((x) => x.id === id);
  if (!v) return <PantallaPos titulo={t('pos.comprobante')}>{null}</PantallaPos>;

  const cliente = contactos.find((c) => c.id === v.cliente) ?? null;
  const c: Comprobante = {
    numero: v.numero,
    subtotal: v.subtotal,
    descuento: v.descuento,
    total: v.total,
    pagos: v.pagos,
    vuelto: v.vuelto,
    iva: v.iva,
    tarifaIva: v.tarifaIva,
    ivaIncluido: v.ivaIncluido,
    lineas: v.lineas.map((l) => ({ nombre: l.nombre, precio: l.precio, cantidad: l.cantidad })),
    cliente: cliente?.nombre ?? null,
    celularCliente: cliente?.celular || null,
  };
  const bodega = bodegas.find((b) => b.id === v.bodega)?.nombre ?? '';

  function preguntarDevolver() {
    Alert.alert(t('pos.historial.devolver'), t('pos.historial.confirmarDevolver', { bodega }), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      {
        text: t('pos.historial.siDevolver'),
        style: 'destructive',
        onPress: async () => {
          setDevolviendo(true);
          const { error: e } = await devolverVenta(v!.id);
          setDevolviendo(false);
          const err = leerErrorInventario(e);
          if (err) return setError(err.codigo === 'yaDevuelta' ? t('pos.historial.yaDevuelta') : t('pos.historial.error'));
          actualizar();
        },
      },
    ]);
  }

  return (
    <PantallaPos titulo={numeroVenta(v.numero)}>
      {v.estado === 'devuelta' && (
        <Texto variante="fuerte" color={colores.errorTexto}>
          {t('pos.historial.devuelta')}
        </Texto>
      )}
      <VistaComprobante c={c} />
      <Boton titulo={t('pos.historial.reenviar')} variante="secundario" onPress={() => Share.share({ message: textoRecibo(c, negocio?.nombre ?? 'Sirumi', t, plata) })} />
      {v.estado !== 'devuelta' && negocio?.rol !== 'seller' && <Boton titulo={t('pos.historial.devolver')} variante="texto" cargando={devolviendo} onPress={preguntarDevolver} />}
      {error && <Aviso mensaje={error} />}
    </PantallaPos>
  );
}
