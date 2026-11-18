import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { GraficaMeses } from '@/components/GraficaMeses';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { comparacionPorCategoria, consejosDelMes, estadosDeTopes, serieMensual, type Consejo } from '@/lib/analisis';
import { armarFecha, diasDelMes, hoyEn, partes, periodoAnterior, periodoPredefinido } from '@/lib/fechas';
import { formatearCorto } from '@/lib/formato';
import { gastosHormiga, proyeccionCierre, tasaAhorro, totalesDelPeriodo } from '@/lib/personal';
import { paisPorCodigo } from '@/onboarding/paises';
import { usePerfil } from '@/auth/perfil';
import { COLORES_CATEGORIA, ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

import { useMovimientos, type AlertaTopes, type Categoria } from './datos';
import { useNombreCategoria, usePlata, useTextosFecha } from './ganchos';

const EMOJI_CONSEJO: Record<Consejo['tipo'], NombreEmoji> = {
  ritmoAlto: 'grafica-que-sube',
  ritmoBien: 'check',
  shoppingAlto: 'bolsas-de-compras',
  gustosAltos: 'balanza',
  gustosBien: 'balanza',
  ahorroBajo: 'alcancia',
  ahorroBien: 'trofeo',
  hormiga: 'hormiga',
  topesSuperados: 'sirena',
};

type Props = { categorias: Categoria[]; topes: Record<string, number>; alerta: AlertaTopes; version: number };

/** Análisis del mes (docs/specs/02-personal.md, pantalla 4; regla A8). */
export function VistaAnalisis({ categorias, topes, alerta, version }: Props) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const perfil = usePerfil();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const nombreCategoria = useNombreCategoria();

  const hoy = hoyEn();
  const { anio, mes, dia } = partes(hoy);
  const esteMes = periodoPredefinido('mes', hoy);
  const mesAnterior = periodoAnterior(esteMes, hoy);
  const inicioSerie = (() => {
    const total = anio * 12 + (mes - 1) - 5;
    return armarFecha(Math.floor(total / 12), (total % 12) + 1, 1);
  })();
  const { movimientos } = useMovimientos(inicioSerie, hoy, version);

  const actual = totalesDelPeriodo(movimientos, esteMes);
  const anterior = totalesDelPeriodo(movimientos, mesAnterior);
  const hoyMes = { diaDeHoy: dia, diasDelMes: diasDelMes(anio, mes) };
  const estados = estadosDeTopes(actual.gastoPorCategoria, topes, esteMes, hoy, alerta);
  const consejos = consejosDelMes({
    gastoMes: actual.gasto,
    ingresosMes: actual.ingreso,
    gastoPorCategoria: porClave(actual.gastoPorCategoria, categorias),
    gastoMesAnterior: anterior.gasto,
    hoy: hoyMes,
    hormiga: gastosHormiga(movimientos, esteMes),
    topesSuperados: Object.values(estados).filter((e) => e.estado === 'superado').length,
  });
  const comparacion = comparacionPorCategoria(actual.gastoPorCategoria, anterior.gastoPorCategoria);
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const nombreMesActual = textosFecha.mesesLargos[mes - 1];
  const nombreMesAnterior = textosFecha.mesesLargos[partes(mesAnterior.desde).mes - 1];
  const mayuscula = (s: string) => s.replace(/^./, (l) => l.toUpperCase());

  const serie = serieMensual(movimientos, hoy, 6).map((m) => ({
    etiqueta: textosFecha.mesesCortos[Number(m.mes.slice(5, 7)) - 1],
    gasto: m.gasto,
    ingreso: m.ingreso,
  }));

  const tasa = tasaAhorro(actual.ingreso, actual.gasto);
  const separador = paisPorCodigo(perfil?.country ?? 'CO').separador;
  const ALERTAS: Consejo['tipo'][] = ['ritmoAlto', 'shoppingAlto', 'gustosAltos', 'ahorroBajo', 'hormiga', 'topesSuperados'];
  const tonoConsejo = (tipo: Consejo['tipo']) =>
    ALERTAS.includes(tipo)
      ? { fondo: colores.errorFondo, titulo: colores.errorTexto }
      : { fondo: oscuro ? COLORES_CATEGORIA.menta.oscuro : COLORES_CATEGORIA.menta.claro, titulo: colores.ingresoTexto };

  return (
    <>
      <View style={{ gap: ESPACIO.xs, marginTop: ESPACIO.s }}>
        <Texto variante="titulo">{t('analisis.tituloPantalla')}</Texto>
        <Texto variante="suave">{t('analisis.subtitulo', { mes: mayuscula(nombreMesActual) })}</Texto>
      </View>

      <Tarjeta>
        <Texto variante="subtitulo">{t('analisis.gastosPorMes')}</Texto>
        <GraficaMeses
          meses={serie}
          textos={{ gastos: t('analisis.gastos'), ingresos: t('analisis.tusIngresos') }}
          corto={(v) => formatearCorto(v, separador)}
          detalle={(m) => t('analisis.detalleMes', { mes: m.etiqueta, gasto: plata(m.gasto), ingreso: plata(m.ingreso) })}
        />
      </Tarjeta>

      {(tasa !== null || actual.gasto > 0) && (
        <View style={{ flexDirection: 'row', gap: ESPACIO.s + 4 }}>
          {tasa !== null && (
            <Tarjeta style={{ flex: 1, padding: ESPACIO.m, gap: 2 }}>
              <Texto variante="etiqueta">{t('analisis.ahorroMes')}</Texto>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 24, lineHeight: 30 }} color={tasa >= 20 ? colores.ingresoTexto : colores.errorTexto}>
                {tasa}%
              </Texto>
            </Tarjeta>
          )}
          {actual.gasto > 0 && (
            <Tarjeta style={{ flex: 1, padding: ESPACIO.m, gap: 2 }}>
              <Texto variante="etiqueta">{t('analisis.cierre')}</Texto>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 20, lineHeight: 30 }} numberOfLines={1} adjustsFontSizeToFit>
                {plata(Math.round(proyeccionCierre(actual.gasto, hoyMes)))}
              </Texto>
            </Tarjeta>
          )}
        </View>
      )}

      <View style={{ gap: ESPACIO.s + 4 }}>
        <Texto variante="subtitulo">{t('analisis.consejosTitulo')}</Texto>
        {consejos.length === 0 && <Texto variante="suave">{t('analisis.sinConsejos')}</Texto>}
        {consejos.map((c) => {
          const tono = tonoConsejo(c.tipo);
          return (
            <View key={c.tipo} style={{ flexDirection: 'row', gap: ESPACIO.m, alignItems: 'flex-start', padding: ESPACIO.m + 2, borderRadius: 20, backgroundColor: tono.fondo }}>
              <Emoji name={EMOJI_CONSEJO[c.tipo]} size={28} />
              <View style={{ flex: 1, gap: 4 }}>
                <Texto variante="fuerte" color={tono.titulo}>
                  {t(`analisis.titulos.${c.tipo}`)}
                </Texto>
                <Texto>{textoConsejo(c)}</Texto>
              </View>
            </View>
          );
        })}
      </View>

      {comparacion.length > 0 && (
        <View style={{ gap: ESPACIO.s + 4 }}>
          <Texto variante="subtitulo">{t('analisis.porCategoria', { mes: nombreMesAnterior })}</Texto>
          {comparacion.map((fila) => {
            const c = porId.get(fila.categoria);
            const sube = (fila.variacion ?? 0) > 0;
            return (
              <View
                key={fila.categoria}
                style={[{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta }, sombraSuave(oscuro)]}>
                <Emoji name={(c?.emoji ?? 'pagina') as NombreEmoji} size={28} />
                <View style={{ flex: 1 }}>
                  <Texto variante="fuerte">{nombreCategoria(c)}</Texto>
                  <Texto variante="pequeno">
                    {plata(fila.actual)} · {nombreMesAnterior}: {plata(fila.anterior)}
                  </Texto>
                </View>
                <View
                  style={{
                    paddingHorizontal: ESPACIO.s + 2,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: fila.variacion === null ? colores.relleno : sube ? colores.errorFondo : oscuro ? COLORES_CATEGORIA.menta.oscuro : COLORES_CATEGORIA.menta.claro,
                  }}>
                  <Texto
                    style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }}
                    color={fila.variacion === null ? colores.textoSuave : sube ? colores.errorTexto : colores.ingresoTexto}>
                    {fila.variacion === null ? t('analisis.sinAnterior') : `${sube ? '+' : '−'}${Math.abs(fila.variacion)}%`}
                  </Texto>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  function textoConsejo(c: Consejo): string {
    switch (c.tipo) {
      case 'ritmoAlto':
        return t('analisis.consejos.ritmoAlto', { proyeccion: plata(c.proyeccion), anterior: plata(c.anterior) });
      case 'ritmoBien':
        return t('analisis.consejos.ritmoBien', { proyeccion: plata(c.proyeccion) });
      case 'shoppingAlto':
      case 'gustosAltos':
      case 'gustosBien':
        return t(`analisis.consejos.${c.tipo}`, { porcentaje: c.porcentaje });
      case 'ahorroBajo':
      case 'ahorroBien':
        return t(`analisis.consejos.${c.tipo}`, { tasa: c.tasa });
      case 'hormiga':
        return t('analisis.consejos.hormiga', { cantidad: c.cantidad, total: plata(c.total) });
      case 'topesSuperados':
        return t('analisis.consejos.topesSuperados', { cantidad: c.cantidad });
    }
  }
}

/** Las reglas usan las claves de las categorías iniciales (shopping, comida, salidas…), no los ids. */
function porClave(gastoPorId: Record<string, number>, categorias: Categoria[]): Record<string, number> {
  const claves = new Map(categorias.map((c) => [c.id, c.key ?? c.id]));
  const resultado: Record<string, number> = {};
  for (const [id, valor] of Object.entries(gastoPorId)) {
    const clave = claves.get(id) ?? id;
    resultado[clave] = (resultado[clave] ?? 0) + valor;
  }
  return resultado;
}
