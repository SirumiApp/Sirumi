import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share, View } from 'react-native';

import { devolverEnEjemplo, devolverParteEnEjemplo } from '@/ejemplo/arenero';
import { modoEjemploActivo } from '@/ejemplo/modo';
import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { devolucionParcial, numeroVenta } from '@/lib/pos';
import { CampoCantidad } from '@/inventario/Piezas';
import { useNegocio } from '@/negocio/contexto';
import { leerErrorInventario } from '@/negocio/inventarioDatos';
import { usePlata } from '@/personal/ganchos';
import type { Comprobante } from '@/pos/contexto';
import { devolverParte, devolverVenta } from '@/pos/datos';
import { PantallaPos } from '@/pos/PantallaPos';
import { textoRecibo } from '@/pos/recibo';
import { VistaComprobante } from '@/pos/VistaComprobante';
import { ESPACIO, useTema } from '@/theme';

/** Detalle de una venta (spec 05, §4): comprobante, reenviar y devolver (D4). */
export default function DetalleVenta() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { negocio, ventas, contactos, bodegas, actualizar } = useNegocio();
  const [error, setError] = useState<string | null>(null);
  const [devolviendo, setDevolviendo] = useState(false);
  // D4b · Devolver parte: cuántas unidades de cada línea (por posición).
  const [parcial, setParcial] = useState<Record<number, number> | null>(null);
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
    lineas: v.lineas.filter((l) => l.cantidad > 0).map((l) => ({ nombre: l.devueltas ? `${l.nombre} (${t('pos.parcial.devueltas', { count: l.devueltas })})` : l.nombre, precio: l.precio, cantidad: l.cantidad })),
    devuelto: v.devuelto ?? 0,
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
          // En el ejemplo la devolución queda en la memoria del celular.
          if (modoEjemploActivo()) {
            devolverEnEjemplo(v!);
            setDevolviendo(false);
            return actualizar();
          }
          const { error: e } = await devolverVenta(v!.id);
          setDevolviendo(false);
          const err = leerErrorInventario(e);
          if (err) return setError(err.codigo === 'yaDevuelta' ? t('pos.historial.yaDevuelta') : t('pos.historial.error'));
          actualizar();
        },
      },
    ]);
  }

  const elegidas = parcial ? Object.entries(parcial).filter(([, n]) => n > 0).map(([i, n]) => ({ indice: Number(i), cantidad: n })) : [];
  const vista = elegidas.length
    ? devolucionParcial({ subtotal: v.subtotal, descuento: v.descuento, total: v.total, iva: v.iva, pagos: v.pagos.map((p) => p.monto) }, elegidas.map((x) => ({ precio: v.lineas[x.indice].precio, cantidad: x.cantidad })))
    : null;

  async function devolverElegidas() {
    if (!v || !vista) return;
    setDevolviendo(true);
    setError(null);
    if (modoEjemploActivo()) {
      devolverParteEnEjemplo(v, elegidas, devolucionParcial);
    } else {
      const { error: e } = await devolverParte(v.id, elegidas.map((x) => ({ id: v.lineas[x.indice].id as string, cantidad: x.cantidad })));
      if (e) {
        setDevolviendo(false);
        const err = leerErrorInventario(e);
        return setError(err?.codigo === 'yaDevuelta' ? t('pos.historial.yaDevuelta') : t('pos.historial.error'));
      }
    }
    setDevolviendo(false);
    setParcial(null);
    actualizar();
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
      {parcial && (
        <Tarjeta style={{ gap: ESPACIO.s }}>
          <Texto variante="subtitulo">{t('pos.parcial.titulo')}</Texto>
          <Texto variante="pequeno">{t('pos.parcial.detalle', { bodega })}</Texto>
          {v.lineas.map((l, i) =>
            l.cantidad > 0 ? (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texto variante="fuerte" numberOfLines={2}>
                    {l.nombre}
                  </Texto>
                  <Texto variante="pequeno">{t('pos.parcial.vendidas', { count: l.cantidad, precio: plata(l.precio) })}</Texto>
                </View>
                <CampoCantidad soloBotones etiqueta={l.nombre} valor={parcial[i] ?? 0} onCambio={(n) => setParcial({ ...parcial, [i]: Math.max(0, Math.min(l.cantidad, n)) })} />
              </View>
            ) : null,
          )}
          {vista && <Texto variante="fuerte">{t(vista.completa ? 'pos.parcial.todo' : 'pos.parcial.devuelves', { monto: plata(vista.reembolso) })}</Texto>}
          <Boton titulo={vista ? t('pos.parcial.confirmar', { monto: plata(vista.reembolso) }) : t('pos.parcial.elige')} disabled={!vista} cargando={devolviendo} onPress={devolverElegidas} />
          <Boton titulo={t('movimiento.cancelar')} variante="texto" onPress={() => setParcial(null)} />
        </Tarjeta>
      )}
      {v.estado !== 'devuelta' && negocio?.rol !== 'seller' && !parcial && (
        <>
          {v.lineas.reduce((s, l) => s + l.cantidad, 0) > 1 && <Boton titulo={t('pos.parcial.boton')} variante="secundario" onPress={() => setParcial({})} />}
          <Boton titulo={t('pos.historial.devolver')} variante="texto" cargando={devolviendo} onPress={preguntarDevolver} />
        </>
      )}
      {error && <Aviso mensaje={error} />}
    </PantallaPos>
  );
}
