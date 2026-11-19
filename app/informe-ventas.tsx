import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { useSesion } from '@/auth/sesion';
import { Boton } from '@/components/Boton';
import { Chip } from '@/components/Chip';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { useModoEjemplo } from '@/ejemplo/modo';
import { hoyEn } from '@/lib/fechas';
import { informeVentas } from '@/lib/ventas';
import { useNegocio } from '@/negocio/contexto';
import { BotonCompartir, FilaCifra, ListaFilas, textoInforme } from '@/negocio/Piezas';
import { cargarVendedores } from '@/negocio/vendedoresDatos';
import { rangoCorto } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { periodoDe, SelectorPeriodo, type EleccionPeriodo } from '@/personal/SelectorPeriodo';
import { ESPACIO, useTema } from '@/theme';

type Vista = 'productos' | 'vendedores' | 'formas' | 'clientes';

/** Informe de ventas del POS (regla D8, como Shopify POS): totales, productos, vendedores, formas de pago y clientes. */
export default function InformeVentas() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const ejemplo = useModoEjemplo();
  const { sesion } = useSesion();
  const { negocio, ventas, contactos } = useNegocio();
  const [eleccion, setEleccion] = useState<EleccionPeriodo>({ tipo: 'mes' });
  const [vista, setVista] = useState<Vista>('productos');
  const [nombres, setNombres] = useState<Map<string, string>>(new Map());
  const hoy = hoyEn();
  const periodo = periodoDe(eleccion, hoy);

  const cargar = useCallback(async () => {
    if (!negocio || ejemplo) return;
    const { vendedores } = await cargarVendedores(negocio.id);
    setNombres(new Map(vendedores.map((v) => [v.usuario, v.nombre])));
  }, [negocio, ejemplo]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor
    cargar();
  }, [cargar]);

  const r = informeVentas(
    ventas.map((v) => ({ id: v.id, fecha: v.fecha, estado: v.estado, total: v.total, descuento: v.descuento, vendedor: v.vendedor, cliente: v.cliente, pagos: v.pagos, lineas: v.lineas, devuelto: v.devuelto })),
    periodo,
  );
  const nombreVendedor = (id: string | null) => (!id || id === sesion?.user.id ? t('informeVentas.tu') : (nombres.get(id) ?? t('informeVentas.otroVendedor')));
  const nombreCliente = new Map(contactos.map((c) => [c.id, c.nombre]));

  const filas: { clave: string; titulo: string; ayuda?: string; valor: string }[] =
    vista === 'productos'
      ? r.porProducto.map((p) => ({
          clave: p.clave,
          titulo: p.nombre,
          ayuda: [t('inventario.unidades', { count: p.unidades }), p.ganancia !== null ? t('informeVentas.ganancia', { monto: plata(p.ganancia) }) : null].filter(Boolean).join(' · '),
          valor: plata(p.ventas),
        }))
      : vista === 'vendedores'
        ? r.porVendedor.map(([id, v]) => ({ clave: id ?? 'yo', titulo: nombreVendedor(id), valor: plata(v) }))
        : vista === 'formas'
          ? r.porForma.map(([f, v]) => ({ clave: f, titulo: f, valor: plata(v) }))
          : r.porCliente.map(([id, v]) => ({ clave: id, titulo: nombreCliente.get(id) ?? '—', valor: plata(v) }));

  const resumenTexto: [string, string][] = [
    [t('informeVentas.ventas'), plata(r.resumen.ventas)],
    [t('informeVentas.numero'), String(r.resumen.numero)],
    [t('informeVentas.ticket'), plata(r.resumen.ticket)],
    [t('informeVentas.descuentos'), plata(r.resumen.descuentos)],
    [t('informeVentas.devoluciones'), `${r.resumen.devueltas} · ${plata(r.resumen.montoDevuelto)}`],
    ...r.porProducto.slice(0, 10).map((p) => [`${p.nombre} (${p.unidades})`, plata(p.ventas)] as [string, string]),
  ];

  return (
    <PantallaAjuste titulo={t('informeVentas.titulo')} detalle={t('informeVentas.detalle')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <View style={{ flex: 1 }}>
          <SelectorPeriodo eleccion={eleccion} hoy={hoy} onCambio={setEleccion} />
        </View>
        <BotonCompartir texto={() => textoInforme(t('informeVentas.titulo'), `${negocio?.nombre ?? ''} · ${rangoCorto(periodo, textosFecha)}`, resumenTexto)} />
      </View>

      <Tarjeta>
        <Texto variante="etiqueta">{t('informeVentas.ventas')}</Texto>
        <Texto variante="heroe" numberOfLines={1} adjustsFontSizeToFit>
          {plata(r.resumen.ventas)}
        </Texto>
        <View style={{ flexDirection: 'row', gap: ESPACIO.m, marginTop: ESPACIO.s }}>
          <View style={{ flex: 1 }}>
            <Texto variante="etiqueta">{t('informeVentas.numero')}</Texto>
            <Texto variante="fuerte">{r.resumen.numero}</Texto>
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="etiqueta">{t('informeVentas.ticket')}</Texto>
            <Texto variante="fuerte">{plata(r.resumen.ticket)}</Texto>
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="etiqueta">{t('informeVentas.unidades')}</Texto>
            <Texto variante="fuerte">{r.resumen.unidades}</Texto>
          </View>
        </View>
        {(r.resumen.descuentos > 0 || r.resumen.devueltas > 0) && (
          <Texto variante="pequeno" style={{ marginTop: ESPACIO.xs }}>
            {[
              r.resumen.descuentos > 0 ? t('informeVentas.diste', { monto: plata(r.resumen.descuentos) }) : null,
              r.resumen.devueltas > 0 ? t('informeVentas.devolviste', { count: r.resumen.devueltas, monto: plata(r.resumen.montoDevuelto) }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Texto>
        )}
      </Tarjeta>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }} contentContainerStyle={{ gap: ESPACIO.s, paddingHorizontal: ESPACIO.m }}>
        {(['productos', 'vendedores', 'formas', 'clientes'] as const).map((v) => (
          <Chip key={v} texto={t(`informeVentas.vistas.${v}`)} elegido={vista === v} onPress={() => setVista(v)} />
        ))}
      </ScrollView>

      {filas.length === 0 ? (
        <Texto variante="suave">{t('informeVentas.vacio')}</Texto>
      ) : (
        <ListaFilas>
          {filas.map((f, i) => (
            <FilaCifra key={f.clave} titulo={vista === 'productos' ? `${i + 1}. ${f.titulo}` : f.titulo} ayuda={f.ayuda} valor={f.valor} />
          ))}
        </ListaFilas>
      )}

      <Boton titulo={t('informeVentas.unaPorUna')} variante="secundario" onPress={() => router.push('/pos/ventas')} />
      <Texto variante="pequeno" color={colores.textoSuave}>
        {t('informeVentas.nota')}
      </Texto>
    </PantallaAjuste>
  );
}
