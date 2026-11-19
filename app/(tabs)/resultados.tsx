import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Barra } from '@/components/Barra';
import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaApp } from '@/components/PantallaApp';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { hoyEn, periodoAnterior } from '@/lib/fechas';
import { apartarDeCada } from '@/lib/informes';
import type { RegimenTributario } from '@/lib/impuestos';
import { deCada100, puntoDeEquilibrio } from '@/lib/negocio';
import { useNegocio } from '@/negocio/contexto';
import { BotonCompartir, conSigno, FilaCifra, ListaFilas, textoInforme } from '@/negocio/Piezas';
import { calcularResumen } from '@/negocio/resumen';
import { rangoCorto } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { periodoDe, SelectorPeriodo, type EleccionPeriodo } from '@/personal/SelectorPeriodo';
import { COLORES_DE_CADA_100, COLORES_GRAFICA, ESPACIO, FUENTES, useTema } from '@/theme';

const pct = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

/** Negocio · Resultados (spec 03, §5.1, §5.4 y §5.8): estado de resultados, de cada $100, impuestos y equilibrio. */
export default function Resultados() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const { negocio, cuentas, movimientos, traslados, parametros, ventas } = useNegocio();
  const hoy = hoyEn();
  const [eleccion, setEleccion] = useState<EleccionPeriodo>({ tipo: 'mes' });

  if (!negocio) return <PantallaApp>{null}</PantallaApp>;

  const periodo = periodoDe(eleccion, hoy);
  const cfg = negocio.configuracion;
  const r = calcularResumen(
    { cuentas: cuentas.map((c) => ({ id: c.id, saldoInicial: c.saldoInicial })), movimientos, traslados, configuracion: cfg, ventas },
    periodo,
    periodoAnterior(periodo, hoy),
    { parametros, regimen: negocio.regimen },
  );
  const e = r.resultados;
  const partes = deCada100(e);
  const regimen: RegimenTributario = negocio.regimen ?? 'simple';
  const fijosMes = cfg.fijos_mes ?? e.fijos;
  const { margen } = puntoDeEquilibrio({ fijosMes, costoPorcentaje: cfg.costo_porcentaje ?? 0, variables: e.variables, ventas: e.ventas });
  const grafica = oscuro ? COLORES_GRAFICA.oscuro : COLORES_GRAFICA.claro;
  const cada100 = oscuro ? COLORES_DE_CADA_100.oscuro : COLORES_DE_CADA_100.claro;

  const filas: { clave: string; titulo: string; ayuda: string; valor: number; fuerte?: boolean; resta?: boolean }[] = [
    { clave: 'ventas', titulo: t('negocioApp.resultados.ventas'), ayuda: t('negocioApp.resultados.ventasAyuda'), valor: e.ventas },
    { clave: 'costo', titulo: t('negocioApp.resultados.costo'), ayuda: t('negocioApp.resultados.costoAyuda', { porcentaje: pct(cfg.costo_porcentaje ?? 0) }), valor: e.costoVentas, resta: true },
    { clave: 'bruta', titulo: t('negocioApp.resultados.bruta'), ayuda: t('negocioApp.resultados.brutaAyuda', { margen: pct(e.margenBruto * 100) }), valor: e.utilidadBruta, fuerte: true },
    { clave: 'fijos', titulo: t('negocioApp.resultados.fijos'), ayuda: t('negocioApp.resultados.fijosAyuda'), valor: e.fijos, resta: true },
    { clave: 'variables', titulo: t('negocioApp.resultados.variables'), ayuda: t('negocioApp.resultados.variablesAyuda'), valor: e.variables, resta: true },
    { clave: 'operativa', titulo: t('negocioApp.resultados.operativa'), ayuda: t('negocioApp.resultados.operativaAyuda'), valor: e.operativa, fuerte: true },
    { clave: 'impuestos', titulo: t('negocioApp.resultados.impuestos'), ayuda: t('negocioApp.resultados.impuestosAyuda', { regimen: t(`negocioApp.regimenes.${regimen}`) }), valor: e.impuestos, resta: true },
    { clave: 'neta', titulo: t('negocioApp.resultados.neta'), ayuda: t('negocioApp.resultados.netaAyuda'), valor: e.neta, fuerte: true },
  ];
  const texto = (f: (typeof filas)[number]) => (f.resta && f.valor > 0 ? `− ${plata(Math.round(f.valor))}` : conSigno(plata, f.valor));

  // De cada $100: piezas de la barra (si pierde, lo que queda es 0 y se avisa aparte).
  const piezas = [
    { clave: 'costo', valor: partes.costo, color: cada100.costo },
    { clave: 'fijos', valor: partes.fijos, color: cada100.fijos },
    { clave: 'variables', valor: partes.variables, color: cada100.variables },
    { clave: 'impuestos', valor: partes.impuestos, color: cada100.impuestos },
    { clave: 'queda', valor: Math.max(0, partes.queda), color: grafica.ingreso },
  ] as const;

  return (
    <PantallaApp>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <View style={{ flex: 1 }}>
          <SelectorPeriodo eleccion={eleccion} hoy={hoy} onCambio={setEleccion} />
        </View>
        <BotonCompartir
          texto={() =>
            textoInforme(
              t('negocioApp.resultados.estado'),
              `${negocio.nombre} · ${rangoCorto(periodo, textosFecha)}`,
              filas.map((f) => [f.titulo, texto(f)]),
            )
          }
        />
      </View>

      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="titulo">{t('negocioApp.resultados.titulo')}</Texto>
        <Texto variante="suave">{t('negocioApp.resultados.detalle')}</Texto>
      </View>

      {e.ventas === 0 && (
        <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
          <Emoji name="bolsas-de-compras" size={40} />
          <Texto variante="suave" style={{ flex: 1 }}>
            {t('negocioApp.resultados.sinVentas')}
          </Texto>
        </Tarjeta>
      )}

      {/* B5 · Estado de resultados */}
      <ListaFilas titulo={t('negocioApp.resultados.estado')}>
        {filas.map((f) => (
          <FilaCifra
            key={f.clave}
            titulo={f.titulo}
            ayuda={f.ayuda}
            valor={texto(f)}
            fuerte={f.fuerte}
            color={f.clave === 'neta' || f.clave === 'operativa' ? (f.valor >= 0 ? colores.ingresoTexto : colores.errorTexto) : undefined}
          />
        ))}
      </ListaFilas>

      {/* B5 · De cada $100 que vendes */}
      {e.ventas > 0 && (
        <Tarjeta style={{ gap: ESPACIO.m }}>
          <Texto variante="subtitulo">{t('negocioApp.resultados.deCada100')}</Texto>
          <View style={{ flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: colores.relleno }} accessible={false}>
            {piezas.map((p) => (p.valor > 0 ? <View key={p.clave} style={{ flex: p.valor, backgroundColor: p.color }} /> : null))}
            {partes.queda < 0 || piezas.reduce((s, p) => s + p.valor, 0) >= 100 ? null : <View style={{ flex: 100 - piezas.reduce((s, p) => s + p.valor, 0) }} />}
          </View>
          <View style={{ gap: ESPACIO.xs }}>
            {piezas.map((p) => (
              <View key={p.clave} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, minHeight: 28 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: p.color }} />
                <Texto variante="medio" style={{ flex: 1 }}>
                  {p.clave === 'queda' && partes.queda < 0 ? t('negocioApp.resultados.partes.pierdes') : t(`negocioApp.resultados.partes.${p.clave}`)}
                </Texto>
                <Texto style={{ fontFamily: FUENTES.textoFuerte }} color={p.clave === 'queda' ? (partes.queda < 0 ? colores.errorTexto : colores.ingresoTexto) : undefined}>
                  {plata(Math.abs(p.clave === 'queda' ? Math.round(partes.queda) : Math.round(p.valor)))}
                </Texto>
              </View>
            ))}
          </View>
        </Tarjeta>
      )}

      {/* D6 · IVA cobrado en el POS: es de la DIAN */}
      {r.ivaCobrado > 0 && (
        <View style={{ flexDirection: 'row', gap: ESPACIO.s, padding: ESPACIO.m, borderRadius: 16, backgroundColor: colores.avisoFondo }}>
          <Emoji name="recibo" size={24} />
          <Texto variante="pequeno" color={colores.avisoTexto} style={{ flex: 1 }}>
            {t('negocioApp.resultados.ivaCobrado', { monto: plata(r.ivaCobrado) })}
          </Texto>
        </View>
      )}

      {/* B7 · Impuestos: comparación de regímenes */}
      <Tarjeta style={{ gap: ESPACIO.s }}>
        <Texto variante="subtitulo">{t('negocioApp.resultados.impuestosTitulo')}</Texto>
        {!r.impuestos || !parametros ? (
          <Texto variante="suave">{t('negocioApp.resultados.sinParametros')}</Texto>
        ) : (
          <>
            <Texto variante="pequeno">{t('negocioApp.resultados.impuestosDetalle')}</Texto>
            {(['simple', 'ordinario', 'natural'] as const).map((rg) => {
              const imp = r.impuestos!;
              const valor = imp[rg];
              const esTuyo = rg === regimen;
              return (
                <View
                  key={rg}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: ESPACIO.s,
                    minHeight: 56,
                    paddingHorizontal: ESPACIO.m,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: esTuyo ? colores.accion : 'transparent',
                    backgroundColor: esTuyo ? colores.seleccionado : colores.relleno,
                  }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texto variante="fuerte">{t(`negocioApp.regimenes.${rg}`)}</Texto>
                    <View style={{ flexDirection: 'row', gap: ESPACIO.xs, flexWrap: 'wrap' }}>
                      {esTuyo && (
                        <Texto variante="pequeno" color={colores.enlace} style={{ fontFamily: FUENTES.textoFuerte }}>
                          {t('negocioApp.resultados.tuRegimen')}
                        </Texto>
                      )}
                      {imp.masBajo === rg && (
                        <Texto variante="pequeno" color={colores.ingresoTexto} style={{ fontFamily: FUENTES.textoFuerte }}>
                          {esTuyo ? '· ' : ''}
                          {t('negocioApp.resultados.masBajo')}
                        </Texto>
                      )}
                    </View>
                  </View>
                  <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }}>{plata(Math.round(valor))}</Texto>
                </View>
              );
            })}
            {e.ventas > 0 && (
              <Texto variante="medio">
                {t('negocioApp.resultados.apartar', { monto: plata(apartarDeCada(e.impuestos, e.ventas)), base: plata(100_000) })}
              </Texto>
            )}
            {r.impuestos.superaTope && (
              <View style={{ flexDirection: 'row', gap: ESPACIO.s, padding: ESPACIO.m, borderRadius: 16, backgroundColor: colores.avisoFondo }}>
                <Emoji name="advertencia" size={22} />
                <Texto variante="pequeno" color={colores.avisoTexto} style={{ flex: 1 }}>
                  {t('negocioApp.resultados.tope', { monto: plata(Math.round(r.impuestos.ventasAnio)), uvt: parametros.topeUvt.toLocaleString('es-CO') })}
                </Texto>
              </View>
            )}
            <Texto variante="pequeno">{t('negocioApp.resultados.orientativo')}</Texto>
            <Boton titulo={t('negocioApp.resultados.cambiarRegimen')} variante="texto" onPress={() => router.push('/arranque')} />
          </>
        )}
      </Tarjeta>

      {/* B8 · Punto de equilibrio */}
      <Tarjeta style={{ gap: ESPACIO.s }}>
        <Texto variante="subtitulo">{t('negocioApp.resultados.equilibrio')}</Texto>
        {r.equilibrio === null ? (
          <Texto variante="suave" color={colores.errorTexto}>
            {t('negocioApp.resumen.sinMargen')}
          </Texto>
        ) : (
          <>
            <Texto variante="etiqueta">{t('negocioApp.resultados.equilibrioMes')}</Texto>
            <Texto variante="cifra">{plata(Math.round(r.equilibrio))}</Texto>
            <Barra valor={r.equilibrio > 0 ? e.ventas / r.equilibrio : 1} color={e.ventas >= r.equilibrio ? grafica.ingreso : colores.accion} alto={10} />
            <Texto variante="pequeno">
              {t('negocioApp.resultados.avance', { porcentaje: r.equilibrio > 0 ? Math.round((e.ventas / r.equilibrio) * 100) : 100 })}{' '}
              {e.ventas >= r.equilibrio
                ? t('negocioApp.resumen.equilibrioSuperado', { monto: plata(Math.round(e.ventas - r.equilibrio)) })
                : t('negocioApp.resumen.equilibrioFalta', { monto: plata(Math.round(r.equilibrio - e.ventas)) })}
            </Texto>
            <Texto variante="pequeno">{t('negocioApp.resultados.margenContribucion', { porcentaje: pct(margen * 100) })}</Texto>
          </>
        )}
      </Tarjeta>
    </PantallaApp>
  );
}
