import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { Chip } from '@/components/Chip';
import { diasEntre, hoyEn, periodoAnterior, sumarDias } from '@/lib/fechas';
import { balance, cartera, duenoYCapital, entradasYSalidas, type Antiguedad } from '@/lib/informes';
import { valorInventario } from '@/lib/inventario';
import { cierreDelDia } from '@/lib/pos';
import { useNegocio } from '@/negocio/contexto';
import { paraReglas } from '@/negocio/inventarioDatos';
import { BotonCompartir, conSigno, FilaCifra, ListaFilas, textoInforme } from '@/negocio/Piezas';
import { calcularResumen } from '@/negocio/resumen';
import { etiquetaDia, rangoCorto } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { periodoDe, SelectorPeriodo, type EleccionPeriodo } from '@/personal/SelectorPeriodo';
import { ESPACIO, useTema } from '@/theme';

type Cual = 'balance' | 'cartera' | 'dueno' | 'entradas' | 'cierre';
const TRAMOS: Antiguedad[] = ['al30', 'al60', 'al90', 'mas90'];

/** Informes del negocio (spec 03, §5): balance, cartera, dueño y capital, entradas y salidas. */
export default function Informe() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const { cual: crudo } = useLocalSearchParams<{ cual: string }>();
  const cual: Cual = (['balance', 'cartera', 'dueno', 'entradas', 'cierre'] as const).find((c) => c === crudo) ?? 'balance';
  const { negocio, cuentas, tarjetas, movimientos, traslados, parametros, productos, stock, ventas } = useNegocio();
  const [eleccion, setEleccion] = useState<EleccionPeriodo>({ tipo: 'mes' });
  const [dia, setDia] = useState<'hoy' | 'ayer'>('hoy');
  const hoy = hoyEn();
  const titulo = cual === 'cierre' ? t('negocioApp.informes.cierre.titulo') : t(`negocioApp.informes.${cual}`);

  if (!negocio) return <PantallaAjuste titulo={titulo}>{null}</PantallaAjuste>;

  const cfg = negocio.configuracion;
  const base = cuentas.map((c) => ({ id: c.id, saldoInicial: c.saldoInicial }));
  const periodo = periodoDe(eleccion, hoy);
  const r = calcularResumen({ cuentas: base, movimientos, traslados, configuracion: cfg, ventas }, periodo, periodoAnterior(periodo, hoy), { parametros, regimen: negocio.regimen });
  const conPeriodo = cual === 'dueno' || cual === 'entradas';
  const fechaCierre = dia === 'hoy' ? hoy : sumarDias(hoy, -1);
  const subtitulo = `${negocio.nombre} · ${cual === 'cierre' ? etiquetaDia(fechaCierre, hoy, textosFecha) : conPeriodo ? rangoCorto(periodo, textosFecha) : t('negocioApp.informes.aHoy')}`;
  let filasTexto: [string, string][] = [];
  let contenido: React.ReactNode = null;

  if (cual === 'balance') {
    const b = balance({
      cuentas: base,
      tarjetas: tarjetas.map((tj) => ({ id: tj.id, cupo: tj.cupo, deudaInicial: tj.deudaInicial })),
      movs: movimientos,
      traslados,
      porCobrar: r.porCobrar,
      porPagar: r.porPagar,
      equipos: cfg.equipos ?? 0,
      inventario: valorInventario(paraReglas(productos), stock).aCosto,
    });
    const tienes: [string, number][] = [
      [t('negocioApp.informes.caja'), b.caja],
      [t('negocioApp.informes.porCobrar'), r.porCobrar],
      [t('negocioApp.informes.inventario'), valorInventario(paraReglas(productos), stock).aCosto],
      [t('negocioApp.informes.equipos'), cfg.equipos ?? 0],
    ];
    const debes: [string, number][] = [
      [t('negocioApp.informes.porPagar'), r.porPagar],
      ...b.tarjetas.map((x) => [t('negocioApp.informes.tarjeta', { nombre: tarjetas.find((tj) => tj.id === x.id)?.nombre ?? '' }), Math.max(0, x.deuda)] as [string, number]),
    ];
    filasTexto = [
      ...tienes.map(([a, v]) => [a, conSigno(plata, v)] as [string, string]),
      [t('negocioApp.informes.tienes'), plata(b.tienes)],
      ...debes.map(([a, v]) => [a, plata(v)] as [string, string]),
      [t('negocioApp.informes.debes'), plata(b.debes)],
      [t('negocioApp.informes.patrimonio'), conSigno(plata, b.patrimonio)],
    ];
    contenido = (
      <>
        <Tarjeta>
          <Texto variante="etiqueta">{t('negocioApp.informes.patrimonio')}</Texto>
          <Texto variante="heroe" color={b.patrimonio < 0 ? colores.errorTexto : colores.texto} numberOfLines={1} adjustsFontSizeToFit>
            {conSigno(plata, b.patrimonio)}
          </Texto>
          <Texto variante="pequeno">{t('negocioApp.informes.patrimonioAyuda')}</Texto>
        </Tarjeta>
        <ListaFilas titulo={t('negocioApp.informes.tienes')}>
          {[
            ...tienes.map(([a, v]) => <FilaCifra key={a} titulo={a} valor={conSigno(plata, v)} />),
            <FilaCifra key="total" titulo={t('negocioApp.informes.total')} valor={conSigno(plata, b.tienes)} fuerte color={colores.ingresoTexto} />,
          ]}
        </ListaFilas>
        <ListaFilas titulo={t('negocioApp.informes.debes')}>
          {[
            ...debes.map(([a, v]) => <FilaCifra key={a} titulo={a} valor={plata(v)} />),
            <FilaCifra key="total" titulo={t('negocioApp.informes.total')} valor={plata(b.debes)} fuerte color={b.debes > 0 ? colores.errorTexto : undefined} />,
          ]}
        </ListaFilas>
      </>
    );
  }

  if (cual === 'cartera') {
    const c = cartera(movimientos, hoy);
    const iniciales = { cobrar: cfg.por_cobrar_inicial ?? 0, pagar: (cfg.deuda_proveedores ?? 0) + (cfg.prestamos ?? 0) };
    const bloque = (lado: 'cobrar' | 'pagar') => {
      const g = lado === 'cobrar' ? c.porCobrar : c.porPagar;
      const total = g.total + iniciales[lado];
      return (
        <View key={lado} style={{ gap: ESPACIO.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Texto variante="subtitulo" style={{ flex: 1 }}>
              {lado === 'cobrar' ? t('negocioApp.informes.teDeben') : t('negocioApp.informes.debesA')}
            </Texto>
            <Texto variante="cifra" color={lado === 'cobrar' ? colores.ingresoTexto : total > 0 ? colores.errorTexto : colores.texto}>
              {plata(total)}
            </Texto>
          </View>
          {total === 0 ? (
            <Texto variante="suave">{t('negocioApp.informes.sinPendientes')}</Texto>
          ) : (
            <>
              <ListaFilas>
                {[
                  ...TRAMOS.map((tr) => <FilaCifra key={tr} titulo={t(`negocioApp.informes.tramos.${tr}`)} valor={plata(g.tramos[tr])} color={tr === 'mas90' && g.tramos[tr] > 0 ? colores.errorTexto : undefined} />),
                  iniciales[lado] > 0 ? <FilaCifra key="ini" titulo={t('negocioApp.informes.delArranque')} valor={plata(iniciales[lado])} /> : null,
                ]}
              </ListaFilas>
              {g.lista.length > 0 && (
                <ListaFilas>
                  {g.lista.slice(0, 20).map((m) => {
                    const dias = diasEntre(m.fecha, hoy);
                    return (
                      <FilaCifra
                        key={m.id}
                        titulo={m.concepto || t(`negocioApp.tipos.${m.tipo}.nombre`)}
                        ayuda={`${etiquetaDia(m.fecha, hoy, textosFecha)} · ${dias <= 0 ? t('negocioApp.informes.hoy') : t('negocioApp.informes.hace', { dias })}`}
                        valor={plata(m.monto)}
                      />
                    );
                  })}
                </ListaFilas>
              )}
            </>
          )}
        </View>
      );
    };
    filasTexto = [
      [t('negocioApp.informes.teDeben'), plata(c.porCobrar.total + iniciales.cobrar)],
      ...TRAMOS.map((tr) => [`  ${t(`negocioApp.informes.tramos.${tr}`)}`, plata(c.porCobrar.tramos[tr])] as [string, string]),
      [t('negocioApp.informes.debesA'), plata(c.porPagar.total + iniciales.pagar)],
      ...TRAMOS.map((tr) => [`  ${t(`negocioApp.informes.tramos.${tr}`)}`, plata(c.porPagar.tramos[tr])] as [string, string]),
    ];
    contenido = [bloque('cobrar'), bloque('pagar')];
  }

  if (cual === 'dueno') {
    const d = duenoYCapital(movimientos, periodo, r.resultados.neta);
    const filas: [string, string, string?][] = [
      [t('negocioApp.informes.aportes'), plata(d.aportes)],
      [t('negocioApp.informes.utilidad'), conSigno(plata, d.neta)],
      [t('negocioApp.informes.retiros'), d.retiros > 0 ? `− ${plata(d.retiros)}` : plata(0)],
    ];
    filasTexto = [...filas.map(([a, b]) => [a, b] as [string, string]), [t('negocioApp.informes.queda'), conSigno(plata, d.queda)], [t('negocioApp.informes.prestamos'), plata(d.prestamos)]];
    contenido = (
      <>
        <ListaFilas>
          {[
            ...filas.map(([a, b]) => <FilaCifra key={a} titulo={a} valor={b} />),
            <FilaCifra key="queda" titulo={t('negocioApp.informes.queda')} ayuda={t('negocioApp.informes.quedaAyuda')} valor={conSigno(plata, d.queda)} fuerte color={d.queda < 0 ? colores.errorTexto : colores.ingresoTexto} />,
          ]}
        </ListaFilas>
        {d.retiros > Math.max(0, d.neta) && (
          <View style={{ padding: ESPACIO.m, borderRadius: 16, backgroundColor: colores.avisoFondo }}>
            <Texto variante="pequeno" color={colores.avisoTexto}>
              {t('negocioApp.informes.retirosAltos')}
            </Texto>
          </View>
        )}
        <ListaFilas>{[<FilaCifra key="p" titulo={t('negocioApp.informes.prestamos')} valor={plata(d.prestamos)} />]}</ListaFilas>
      </>
    );
  }

  if (cual === 'cierre') {
    const c = cierreDelDia(ventas, fechaCierre);
    const nombreCuenta = new Map(cuentas.map((x) => [x.id, x.nombre]));
    const cuentaVisible = (id: string | null) => (id ? (nombreCuenta.get(id) ?? '—') : t('negocioApp.informes.porCobrar'));
    filasTexto = [
      [t('negocioApp.informes.cierre.ventas'), String(c.ventas)],
      [t('negocioApp.informes.total'), plata(c.total)],
      ...c.porForma.map(([f, v]) => [f, plata(v)] as [string, string]),
    ];
    contenido = (
      <>
        <View style={{ flexDirection: 'row', gap: ESPACIO.s }}>
          <Chip texto={t('fechas.hoy')} elegido={dia === 'hoy'} onPress={() => setDia('hoy')} />
          <Chip texto={t('fechas.ayer')} elegido={dia === 'ayer'} onPress={() => setDia('ayer')} />
        </View>
        <Tarjeta>
          <Texto variante="etiqueta">{t('negocioApp.informes.cierre.vendido')}</Texto>
          <Texto variante="heroe" numberOfLines={1} adjustsFontSizeToFit>
            {plata(c.total)}
          </Texto>
          <Texto variante="pequeno">{t('negocioApp.informes.cierre.enVentas', { count: c.ventas })}</Texto>
        </Tarjeta>
        {c.ventas === 0 ? (
          <Texto variante="suave">{t('negocioApp.informes.cierre.sinVentas')}</Texto>
        ) : (
          <>
            <ListaFilas titulo={t('negocioApp.informes.cierre.porForma')}>{c.porForma.map(([f, v]) => <FilaCifra key={f} titulo={f} valor={plata(v)} />)}</ListaFilas>
            <ListaFilas titulo={t('negocioApp.informes.cierre.porCuenta')}>
              {c.porCuenta.map(([cu, v]) => <FilaCifra key={cu ?? 'fiado'} titulo={cuentaVisible(cu)} valor={plata(v)} />)}
            </ListaFilas>
          </>
        )}
      </>
    );
  }

  if (cual === 'entradas') {
    const e = entradasYSalidas(movimientos, periodo);
    filasTexto = [
      [t('negocioApp.informes.entraron'), plata(e.entradas)],
      [t('negocioApp.informes.salieron'), plata(e.salidas)],
      [t('negocioApp.informes.diferencia'), conSigno(plata, e.entradas - e.salidas)],
      ...e.filas.map((f) => [t(`negocioApp.tipos.${f.tipo}.nombre`), `${f.entra ? '+' : '−'} ${plata(f.monto)}`] as [string, string]),
    ];
    contenido =
      e.filas.length === 0 ? (
        <Texto variante="suave">{t('negocioApp.informes.sinMovimientos')}</Texto>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: ESPACIO.s + 4 }}>
            <Tarjeta style={{ flex: 1, padding: ESPACIO.m, gap: 2 }}>
              <Texto variante="etiqueta">{t('negocioApp.informes.entraron')}</Texto>
              <Texto variante="fuerte" color={colores.ingresoTexto} numberOfLines={1} adjustsFontSizeToFit>
                {plata(e.entradas)}
              </Texto>
            </Tarjeta>
            <Tarjeta style={{ flex: 1, padding: ESPACIO.m, gap: 2 }}>
              <Texto variante="etiqueta">{t('negocioApp.informes.salieron')}</Texto>
              <Texto variante="fuerte" numberOfLines={1} adjustsFontSizeToFit>
                {plata(e.salidas)}
              </Texto>
            </Tarjeta>
          </View>
          <ListaFilas>
            {[
              ...e.filas.map((f) => (
                <FilaCifra
                  key={f.tipo}
                  titulo={t(`negocioApp.tipos.${f.tipo}.nombre`)}
                  valor={`${f.entra ? '+' : '−'} ${plata(f.monto)}`}
                  color={f.entra ? colores.ingresoTexto : undefined}
                />
              )),
              <FilaCifra key="dif" titulo={t('negocioApp.informes.diferencia')} valor={conSigno(plata, e.entradas - e.salidas)} fuerte color={e.entradas - e.salidas < 0 ? colores.errorTexto : colores.ingresoTexto} />,
            ]}
          </ListaFilas>
        </>
      );
  }

  return (
    <PantallaAjuste titulo={titulo}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <View style={{ flex: 1 }}>
          {conPeriodo ? <SelectorPeriodo eleccion={eleccion} hoy={hoy} onCambio={setEleccion} /> : <Texto variante="suave">{subtitulo}</Texto>}
        </View>
        <BotonCompartir texto={() => textoInforme(titulo, subtitulo, filasTexto)} />
      </View>
      {contenido}
    </PantallaAjuste>
  );
}
