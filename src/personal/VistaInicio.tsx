import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { usePerfil } from '@/auth/perfil';
import { Barra } from '@/components/Barra';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { diasDelMes, esMesCompletoOActual, hoyEn, partes, periodoAnterior } from '@/lib/fechas';
import {
  agruparPorDia,
  consejoDelPeriodo,
  mesesDelPeriodo,
  totalesDelPeriodo,
  variacionPorcentual,
  type Movimiento,
} from '@/lib/personal';
import { disponibleParaGastar, estadoDelPlan, leQueda, porDia } from '@/lib/plan';
import { estadosDeTopes } from '@/lib/analisis';

import { ChipEstadoTope, useColorEstadoTope } from './ChipEstadoTope';
import { useMovimientos, type AlertaTopes, type Categoria } from './datos';
import { etiquetaDia, nombreMes } from './etiquetas';
import { useNombreCategoria, usePlata, useTextosFecha } from './ganchos';
import { periodoDe, SelectorPeriodo, type EleccionPeriodo } from './SelectorPeriodo';
import { ALTO_TOCABLE, COLORES_CATEGORIA, ESPACIO, FUENTES, RADIO, useTema, type ColorCategoria, sombraSuave } from '@/theme';

/** Lo que guardó el onboarding en profiles.preferences.plan. */
function leerPlan(preferencias: unknown): { ingreso: number; separar: number } | null {
  const plan = (
    preferencias as {
      plan?: { objetivo?: string; ingreso?: number; separar?: number };
    } | null
  )?.plan;
  if (!plan || plan.objetivo === 'ver' || !plan.ingreso || !plan.separar) return null;
  return { ingreso: plan.ingreso, separar: plan.separar };
}

type Props = {
  categorias: Categoria[];
  topes: Record<string, number>;
  alerta: AlertaTopes;
  /** Cambia cada vez que se guarda un movimiento, para volver a leer. */
  version: number;
  onEditar: (m: Movimiento) => void;
};

/** Inicio de finanzas personales (docs/specs/02-personal.md, pantalla 1). */
export function VistaInicio({ categorias, topes, alerta, version, onEditar }: Props) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const nombreCategoria = useNombreCategoria();
  const perfil = usePerfil();

  const hoy = hoyEn();
  const [eleccion, setEleccion] = useState<EleccionPeriodo>({ tipo: 'mes' });
  const periodo = periodoDe(eleccion, hoy);
  const anterior = periodoAnterior(periodo, hoy);

  const { movimientos, cargando } = useMovimientos(anterior.desde, periodo.hasta, version);

  const [filtro, setFiltro] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const porId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const actual = totalesDelPeriodo(movimientos, periodo);
  const previo = totalesDelPeriodo(movimientos, anterior);
  const variacion = variacionPorcentual(actual.gasto, previo.gasto);
  const nombreAnterior = esMesCompletoOActual(periodo, hoy) ? nombreMes(anterior.desde, textosFecha) : t('periodo.anterior');
  const consejo = consejoDelPeriodo(actual.gastoPorCategoria, topes, mesesDelPeriodo(periodo, hoy));

  // Tarjeta del plan: solo en "Este mes" y si hizo plan en el onboarding.
  const plan = leerPlan(perfil?.preferences);
  const disponible = plan ? disponibleParaGastar(plan.ingreso, plan.separar) : 0;
  const hoyPartes = partes(hoy);

  const tarjetasCategoria = Object.entries(actual.gastoPorCategoria).sort((a, b) => b[1] - a[1]);
  const maximo = Math.max(1, ...tarjetasCategoria.map(([, v]) => v));
  // Mismo cálculo que la pestaña Topes (A3), ajustado al período elegido.
  const estadosTopes = estadosDeTopes(actual.gastoPorCategoria, topes, periodo, hoy, alerta);
  const colorEstado = useColorEstadoTope();

  const texto = busqueda.trim().toLowerCase();
  const enPeriodo = movimientos.filter((m) => m.fecha >= periodo.desde && m.fecha <= periodo.hasta);
  const filtrados = enPeriodo.filter(
    (m) =>
      (filtro === null || m.categoria === filtro) &&
      (texto === '' ||
        (m.descripcion ?? '').toLowerCase().includes(texto) ||
        nombreCategoria(porId.get(m.categoria)).toLowerCase().includes(texto)),
  );
  const grupos = agruparPorDia(filtrados);
  const sinNada = !cargando && enPeriodo.length === 0;

  function tinte(c: Categoria | undefined) {
    const color = COLORES_CATEGORIA[(c?.color as ColorCategoria) in COLORES_CATEGORIA ? (c?.color as ColorCategoria) : 'gris'];
    return oscuro ? color.oscuro : color.claro;
  }

  return (
    <>
      <SelectorPeriodo
        eleccion={eleccion}
        hoy={hoy}
        onCambio={(e) => {
          setEleccion(e);
          setFiltro(null);
        }}
      />

      {/* Total del período y comparación (A1, A2) */}
      <Tarjeta>
        <Texto variante="suave">{t('inicio.gastaste')}</Texto>
        <Texto variante="cifra">{plata(actual.gasto)}</Texto>
        <Texto variante="pequeno">
          {variacion === null
            ? t('inicio.sinGastosAntes', { periodo: nombreAnterior })
            : variacion >= 0
              ? t('inicio.variacionSube', {
                  porcentaje: variacion,
                  periodo: nombreAnterior,
                })
              : t('inicio.variacionBaja', {
                  porcentaje: Math.abs(variacion),
                  periodo: nombreAnterior,
                })}
        </Texto>
        {actual.ingreso > 0 && (
          <Texto variante="pequeno" color={colores.ingreso}>
            {t('inicio.ingresos', { monto: plata(actual.ingreso) })}
          </Texto>
        )}
      </Tarjeta>

      {/* Plan del mes (A4) */}
      {plan &&
        eleccion.tipo === 'mes' &&
        (() => {
          const queda = leQueda(disponible, actual.gasto);
          const estado = estadoDelPlan(disponible, actual.gasto);
          const color = estado === 'tePasaste' ? colores.error : estado === 'cuidado' ? colores.aviso : colores.accion;
          return (
            <Tarjeta>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <Texto variante="fuerte">{t('inicio.plan.titulo')}</Texto>
                <View
                  style={{
                    paddingHorizontal: ESPACIO.s,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: colores.seleccionado,
                  }}>
                  <Texto
                    variante="pequeno"
                    style={{ fontFamily: FUENTES.textoFuerte }}
                    color={estado === 'bien' ? colores.texto : color}>
                    {t(`plan.estado.${estado}`)}
                  </Texto>
                </View>
              </View>
              <Barra valor={disponible > 0 ? actual.gasto / disponible : 1} color={color} />
              <Texto variante="pequeno">{t('inicio.plan.disponible', { monto: plata(disponible) })}</Texto>
              <Texto variante="fuerte">
                {queda >= 0
                  ? t('inicio.plan.queda', { monto: plata(queda) })
                  : t('inicio.plan.pasaste', { monto: plata(-queda) })}
              </Texto>
              {queda > 0 && (
                <Texto variante="pequeno">
                  {t('inicio.plan.porDia', {
                    monto: plata(
                      Math.floor(
                        porDia(queda, {
                          diasDelMes: diasDelMes(hoyPartes.anio, hoyPartes.mes),
                          diaDeHoy: hoyPartes.dia,
                        }),
                      ),
                    ),
                  })}
                </Texto>
              )}
            </Tarjeta>
          );
        })()}

      {/* Sin ningún movimiento (ni este mes ni el anterior): explica qué hacer. */}
      {sinNada && eleccion.tipo === 'mes' && movimientos.length === 0 ? (
        <Tarjeta style={{ alignItems: 'center', paddingVertical: ESPACIO.xl }}>
          <Emoji name="lapiz" size={64} />
          <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
            {t('inicio.vacio.titulo')}
          </Texto>
          <Texto variante="suave" style={{ textAlign: 'center' }}>
            {t('inicio.vacio.detalle')}
          </Texto>
        </Tarjeta>
      ) : sinNada ? (
        <Texto variante="suave" style={{ textAlign: 'center' }}>
          {t('inicio.vacioPeriodo')}
        </Texto>
      ) : null}

      {/* Por categoría: tocar una filtra la lista */}
      {tarjetasCategoria.length > 0 && (
        <View style={{ gap: ESPACIO.s }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Texto variante="subtitulo">{t('inicio.porCategoria')}</Texto>
            {filtro && <Boton titulo={t('inicio.quitarFiltro')} variante="texto" onPress={() => setFiltro(null)} />}
          </View>
          {tarjetasCategoria.map(([id, valor]) => {
            const c = porId.get(id);
            const elegida = filtro === id;
            const estado = estadosTopes[id];
            const conTope = !!estado && estado.tope > 0;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: elegida }}
                onPress={() => setFiltro(elegida ? null : id)}
                style={[
                  {
                    gap: ESPACIO.xs,
                    padding: ESPACIO.m,
                    borderRadius: RADIO.l,
                    backgroundColor: colores.tarjeta,
                    borderWidth: 2,
                    borderColor: elegida ? colores.accion : 'transparent',
                  },
                  sombraSuave(oscuro),
                ]}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: ESPACIO.s,
                  }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: tinte(c),
                    }}>
                    <Emoji name={(c?.emoji ?? 'pagina') as NombreEmoji} size={24} />
                  </View>
                  <Texto variante="fuerte" style={{ flex: 1 }}>
                    {nombreCategoria(c)}
                  </Texto>
                  <Texto variante="fuerte">{plata(valor)}</Texto>
                </View>
                {conTope ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Texto variante="pequeno">{t('topes.gastoDeTope', { gastado: plata(estado.gastado), tope: plata(estado.tope) })}</Texto>
                      <ChipEstadoTope estado={estado} />
                    </View>
                    <Barra valor={estado.gastado / estado.tope} color={colorEstado(estado)} />
                  </>
                ) : (
                  <Barra valor={valor / maximo} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Consejo del período */}
      {consejo && (
        <Tarjeta
          style={{
            flexDirection: 'row',
            gap: ESPACIO.m,
            alignItems: 'flex-start',
          }}>
          <Emoji name="bombillo" size={32} />
          <View style={{ flex: 1, gap: ESPACIO.xs }}>
            <Texto variante="fuerte">{t('inicio.consejo.titulo')}</Texto>
            <Texto>
              {consejo.ahorro !== null && consejo.tope !== null
                ? t('inicio.consejo.bajar', {
                    categoria: nombreCategoria(porId.get(consejo.categoria)),
                    porcentaje: consejo.porcentaje,
                    tope: plata(consejo.tope),
                    ahorro: plata(consejo.ahorro),
                  })
                : t('inicio.consejo.mayor', {
                    categoria: nombreCategoria(porId.get(consejo.categoria)),
                    porcentaje: consejo.porcentaje,
                  })}
            </Texto>
          </View>
        </Tarjeta>
      )}

      {/* Movimientos agrupados por día */}
      {enPeriodo.length > 0 && (
        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="subtitulo">{t('inicio.movimientos')}</Texto>
          <CampoTexto
            etiqueta={t('inicio.buscar')}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
            returnKeyType="search"
          />
          {grupos.length === 0 && <Texto variante="suave">{t('inicio.sinResultados')}</Texto>}
          {grupos.map((g) => (
            <View key={g.fecha} style={{ gap: ESPACIO.xs }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: ESPACIO.s,
                }}>
                <Texto variante="fuerte">{etiquetaDia(g.fecha, hoy, textosFecha)}</Texto>
                {g.totalGastos > 0 && <Texto variante="suave">{plata(g.totalGastos)}</Texto>}
              </View>
              {g.movimientos.map((m) => {
                const c = porId.get(m.categoria);
                return (
                  <Pressable
                    key={m.id}
                    accessibilityRole="button"
                    onPress={() => onEditar(m)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: ESPACIO.s,
                      minHeight: ALTO_TOCABLE + 12,
                      padding: ESPACIO.s,
                      borderRadius: RADIO.m,
                      backgroundColor: pressed ? colores.seleccionado : colores.tarjeta,
                    })}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: tinte(c),
                      }}>
                      <Emoji name={(c?.emoji ?? 'pagina') as NombreEmoji} size={24} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Texto variante="fuerte" numberOfLines={1}>
                        {m.descripcion || nombreCategoria(c)}
                      </Texto>
                      {m.descripcion ? <Texto variante="pequeno">{nombreCategoria(c)}</Texto> : null}
                    </View>
                    <Texto variante="fuerte" color={m.tipo === 'ingreso' ? colores.ingreso : colores.texto}>
                      {m.tipo === 'ingreso' ? `+ ${plata(m.monto)}` : plata(m.monto)}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </>
  );
}
