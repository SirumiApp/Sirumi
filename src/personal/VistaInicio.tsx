import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { usePerfil } from '@/auth/perfil';
import { Barra } from '@/components/Barra';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { Icono } from '@/components/Icono';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { estadosDeTopes } from '@/lib/analisis';
import { patrimonioActual } from '@/lib/metas';
import { diasDelMes, esMesCompletoOActual, hoyEn, partes, periodoAnterior } from '@/lib/fechas';
import { formatearCorto } from '@/lib/formato';
import { agruparPorDia, consejoDelPeriodo, mesesDelPeriodo, totalesDelPeriodo, variacionPorcentual, type Movimiento } from '@/lib/personal';
import { disponibleParaGastar, estadoDelPlan, leQueda, porDia, type EstadoPlan } from '@/lib/plan';
import { paisPorCodigo } from '@/onboarding/paises';
import { ALTO_TOCABLE, COLORES_CATEGORIA, ESPACIO, FUENTES, sombraSuave, useTema, type ColorCategoria } from '@/theme';

import { useColorEstadoTope } from './ChipEstadoTope';
import { useMovimientos, type AlertaTopes, type Categoria } from './datos';
import { etiquetaDia, nombreMes } from './etiquetas';
import { useNombreCategoria, usePlata, useTextosFecha } from './ganchos';
import { periodoDe, SelectorPeriodo, type EleccionPeriodo } from './SelectorPeriodo';
import { usePlanPersonal } from './planDatos';

type PlanGuardado = { objetivo: 'ahorro' | 'deudas' | 'meta'; ingreso: number; separar: number; meta?: string };

/** Lo que guardó el onboarding en profiles.preferences.plan. */
function leerPlan(preferencias: unknown): PlanGuardado | null {
  const plan = (preferencias as { plan?: { objetivo?: string; ingreso?: number; separar?: number; meta?: { nombre?: string } } } | null)?.plan;
  if (!plan || !plan.ingreso || !plan.separar) return null;
  if (plan.objetivo !== 'ahorro' && plan.objetivo !== 'deudas' && plan.objetivo !== 'meta') return null;
  return { objetivo: plan.objetivo, ingreso: plan.ingreso, separar: plan.separar, meta: plan.meta?.nombre };
}

type Props = {
  categorias: Categoria[];
  topes: Record<string, number>;
  alerta: AlertaTopes;
  /** Cambia cada vez que se guarda un movimiento, para volver a leer. */
  version: number;
  onEditar: (m: Movimiento) => void;
};

/** Inicio de finanzas personales (docs/specs/02-personal.md, pantalla 1), con el diseño del prototipo. */
export function VistaInicio({ categorias, topes, alerta, version, onEditar }: Props) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const nombreCategoria = useNombreCategoria();
  const colorEstadoTope = useColorEstadoTope();
  const perfil = usePerfil();
  const separador = paisPorCodigo(perfil?.country ?? 'CO').separador;

  const hoy = hoyEn();
  const [eleccion, setEleccion] = useState<EleccionPeriodo>({ tipo: 'mes' });
  const periodo = periodoDe(eleccion, hoy);
  const anterior = periodoAnterior(periodo, hoy);
  const { movimientos, cargando } = useMovimientos(anterior.desde, periodo.hasta, version);

  const [filtro, setFiltro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const porId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const actual = totalesDelPeriodo(movimientos, periodo);
  const previo = totalesDelPeriodo(movimientos, anterior);
  const variacion = variacionPorcentual(actual.gasto, previo.gasto);
  const esMes = esMesCompletoOActual(periodo, hoy);
  const nombreAnterior = esMes ? nombreMes(anterior.desde, textosFecha) : t('periodo.anterior');
  const consejo = consejoDelPeriodo(actual.gastoPorCategoria, topes, mesesDelPeriodo(periodo, hoy));
  const estadosTopes = estadosDeTopes(actual.gastoPorCategoria, topes, periodo, hoy, alerta);

  const plan = leerPlan(perfil?.preferences);
  // Ajustes → "Mostrar ingresos" (por defecto, sí).
  const mostrarIngresos = (perfil?.preferences as { mostrarIngresos?: boolean } | null)?.mostrarIngresos !== false;
  const tarjetasCategoria = Object.entries(actual.gastoPorCategoria).sort((a, b) => b[1] - a[1]);
  const maximo = Math.max(1, ...tarjetasCategoria.map(([, v]) => v));

  const texto = busqueda.trim().toLowerCase();
  const enPeriodo = movimientos.filter((m) => m.fecha >= periodo.desde && m.fecha <= periodo.hasta);
  const filtrados = enPeriodo.filter(
    (m) =>
      (filtro === null || m.categoria === filtro) &&
      (texto === '' || (m.descripcion ?? '').toLowerCase().includes(texto) || nombreCategoria(porId.get(m.categoria)).toLowerCase().includes(texto)),
  );
  const grupos = agruparPorDia(filtrados);
  const sinNada = !cargando && enPeriodo.length === 0;

  const tinte = (c: Categoria | undefined) => {
    const color = COLORES_CATEGORIA[(c?.color as ColorCategoria) in COLORES_CATEGORIA ? (c?.color as ColorCategoria) : 'gris'];
    return oscuro ? color.oscuro : color.claro;
  };
  const sinSigno = (valor: number) => plata(valor).replace(/^-?\$\s?/, '');

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

      {/* Cifra principal: cuánto se gastó (A1) y comparación (A2) */}
      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="medio" color={colores.textoSuave}>
          {esMes ? t('hogar.gastadoMes', { mes: nombreMes(periodo.desde, textosFecha) }) : t('hogar.gastadoPeriodo')}
        </Texto>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }} accessibilityLabel={plata(actual.gasto)}>
          <Texto variante="heroe">{sinSigno(actual.gasto)}</Texto>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 22, lineHeight: 40 }} color={colores.textoSuave}>
            $
          </Texto>
        </View>
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: ESPACIO.s + 4, paddingVertical: 4, borderRadius: 999, backgroundColor: colores.seleccionado }}>
          <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={colores.enlace}>
            {variacion === null
              ? t('inicio.sinGastosAntes', { periodo: nombreAnterior })
              : variacion >= 0
                ? t('inicio.variacionSube', { porcentaje: variacion, periodo: nombreAnterior })
                : t('inicio.variacionBaja', { porcentaje: Math.abs(variacion), periodo: nombreAnterior })}
          </Texto>
        </View>
      </View>

      {/* Plan del mes (A4): solo en "Este mes" y si hizo plan en el onboarding */}
      {plan && eleccion.tipo === 'mes' && <TarjetaPlan plan={plan} gastado={actual.gasto} hoy={hoy} />}

      {/* Ingresos y lo que queda */}
      {mostrarIngresos && (actual.ingreso > 0 || actual.gasto > 0) && (
        <View style={{ flexDirection: 'row', gap: ESPACIO.s + 4 }}>
          <Tarjeta style={{ flex: 1, padding: ESPACIO.m, gap: 2 }}>
            <Texto variante="etiqueta">{t('hogar.ingresos')}</Texto>
            <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 20, lineHeight: 26 }} color={colores.ingresoTexto} numberOfLines={1} adjustsFontSizeToFit>
              {plata(actual.ingreso)}
            </Texto>
          </Tarjeta>
          <Tarjeta style={{ flex: 1, padding: ESPACIO.m, gap: 2 }}>
            <Texto variante="etiqueta">{t('hogar.teQueda')}</Texto>
            <Texto
              style={{ fontFamily: FUENTES.titulo, fontSize: 20, lineHeight: 26 }}
              color={actual.ingreso - actual.gasto < 0 ? colores.errorTexto : colores.texto}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {plata(actual.ingreso - actual.gasto)}
            </Texto>
          </Tarjeta>
        </View>
      )}

      {/* Mi patrimonio · Metas y deudas (como el prototipo) */}
      <TarjetaPatrimonio version={version} />

      {/* Sin ningún movimiento: explica qué hacer */}
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

      {/* Recomendación */}
      {consejo && (
        <View style={{ flexDirection: 'row', gap: ESPACIO.m, alignItems: 'flex-start', padding: ESPACIO.l, borderRadius: 20, backgroundColor: colores.seleccionado }}>
          <Emoji name="bombillo" size={28} />
          <View style={{ flex: 1, gap: 4 }}>
            <Texto variante="fuerte" color={colores.enlace}>
              {t('inicio.consejo.titulo')}
            </Texto>
            <Texto>
              {consejo.ahorro !== null && consejo.tope !== null
                ? t('inicio.consejo.bajar', {
                    categoria: nombreCategoria(porId.get(consejo.categoria)),
                    porcentaje: consejo.porcentaje,
                    tope: plata(consejo.tope),
                    ahorro: plata(consejo.ahorro),
                  })
                : t('inicio.consejo.mayor', { categoria: nombreCategoria(porId.get(consejo.categoria)), porcentaje: consejo.porcentaje })}
            </Texto>
          </View>
        </View>
      )}

      {/* Por categoría: tarjetas que se deslizan; tocar una filtra la lista */}
      {tarjetasCategoria.length > 0 && (
        <View style={{ gap: ESPACIO.s }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Texto variante="subtitulo">{t('inicio.porCategoria')}</Texto>
            {filtro && <Boton titulo={t('inicio.quitarFiltro')} variante="texto" onPress={() => setFiltro(null)} />}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, marginHorizontal: -ESPACIO.m }}
            contentContainerStyle={{ gap: ESPACIO.s + 4, paddingHorizontal: ESPACIO.m, paddingVertical: ESPACIO.s }}>
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
                  accessibilityLabel={`${nombreCategoria(c)}: ${plata(valor)}`}
                  onPress={() => setFiltro(elegida ? null : id)}
                  style={({ pressed }) => [
                    {
                      width: 124,
                      gap: ESPACIO.s,
                      padding: ESPACIO.m,
                      borderRadius: 20,
                      backgroundColor: colores.tarjeta,
                      borderWidth: 2,
                      borderColor: elegida ? colores.accion : 'transparent',
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                    sombraSuave(oscuro),
                  ]}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: tinte(c) }}>
                    <Emoji name={(c?.emoji ?? 'pagina') as NombreEmoji} size={26} />
                  </View>
                  <Texto variante="etiqueta" numberOfLines={1}>
                    {nombreCategoria(c)}
                  </Texto>
                  <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 19, lineHeight: 24 }}>{formatearCorto(valor, separador)}</Texto>
                  <Barra valor={conTope ? estado.gastado / estado.tope : valor / maximo} color={conTope ? colorEstadoTope(estado) : colores.accion} alto={6} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Movimientos agrupados por día */}
      {enPeriodo.length > 0 && (
        <View style={{ gap: ESPACIO.s }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Texto variante="subtitulo">{t('inicio.movimientos')}</Texto>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={buscando ? t('hogar.cerrarBuscar') : t('hogar.buscar')}
              onPress={() => {
                setBuscando((b) => !b);
                setBusqueda('');
              }}
              style={[{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.tarjeta }, sombraSuave(oscuro)]}>
              <Icono nombre={buscando ? 'cerrar' : 'buscar'} tamano={20} />
            </Pressable>
          </View>
          {buscando && <CampoTexto etiqueta="" accessibilityLabel={t('inicio.buscar')} placeholder={t('inicio.buscar')} value={busqueda} onChangeText={setBusqueda} autoCorrect={false} autoFocus returnKeyType="search" />}
          {grupos.length === 0 && <Texto variante="suave">{t('inicio.sinResultados')}</Texto>}
          {grupos.map((g) => (
            <View key={g.fecha} style={{ gap: ESPACIO.s }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: ESPACIO.s }}>
                <Texto variante="medio" color={colores.textoSuave}>
                  {etiquetaDia(g.fecha, hoy, textosFecha)}
                </Texto>
                {g.totalGastos > 0 && (
                  <Texto variante="medio" color={colores.textoSuave}>
                    {plata(g.totalGastos)}
                  </Texto>
                )}
              </View>
              {g.movimientos.map((m) => {
                const c = porId.get(m.categoria);
                return (
                  <Pressable
                    key={m.id}
                    accessibilityRole="button"
                    onPress={() => onEditar(m)}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: ESPACIO.s + 4,
                        minHeight: 72,
                        paddingHorizontal: ESPACIO.m,
                        paddingVertical: ESPACIO.s + 4,
                        borderRadius: 20,
                        backgroundColor: colores.tarjeta,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                      sombraSuave(oscuro),
                    ]}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tinte(c) }}>
                      <Emoji name={(c?.emoji ?? 'pagina') as NombreEmoji} size={24} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Texto variante="etiqueta" numberOfLines={1}>
                        {nombreCategoria(c)}
                      </Texto>
                      <Texto variante="fuerte" numberOfLines={1}>
                        {m.descripcion || nombreCategoria(c)}
                      </Texto>
                    </View>
                    <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }} color={m.tipo === 'ingreso' ? colores.ingresoTexto : colores.texto}>
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

/** Tarjeta del plan del mes (A4), como en el prototipo: máximo para gastar, estado, barra y explicación. */
function TarjetaPlan({ plan, gastado, hoy }: { plan: PlanGuardado; gastado: number; hoy: string }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const disponible = disponibleParaGastar(plan.ingreso, plan.separar);
  const queda = leQueda(disponible, gastado);
  const estado: EstadoPlan = estadoDelPlan(disponible, gastado);
  const { anio, mes, dia } = partes(hoy);
  const diario = queda > 0 ? Math.floor(porDia(queda, { diasDelMes: diasDelMes(anio, mes), diaDeHoy: dia })) : 0;

  const fondoChip = estado === 'tePasaste' ? colores.errorFondo : estado === 'cuidado' ? colores.avisoFondo : colores.seleccionado;
  const textoChip = estado === 'tePasaste' ? colores.errorTexto : estado === 'cuidado' ? colores.avisoTexto : colores.enlace;
  const barra = estado === 'tePasaste' ? colores.error : estado === 'cuidado' ? colores.aviso : colores.accion;
  const titulo =
    plan.objetivo === 'ahorro'
      ? t('hogar.planAhorro')
      : plan.objetivo === 'deudas'
        ? t('hogar.planDeudas')
        : plan.meta
          ? t('hogar.planMeta', { nombre: plan.meta })
          : t('hogar.planMetaSinNombre');
  const separas =
    plan.objetivo === 'ahorro' ? 'hogar.separasAhorro' : plan.objetivo === 'deudas' ? 'hogar.separasDeudas' : 'hogar.separasMeta';
  const emoji: NombreEmoji = plan.objetivo === 'ahorro' ? 'alcancia' : plan.objetivo === 'deudas' ? 'tarjeta' : 'diana';

  return (
    <Tarjeta style={{ gap: ESPACIO.s + 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4 }}>
        <Emoji name={emoji} size={36} />
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta">{titulo}</Texto>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 18, lineHeight: 24 }} numberOfLines={1} adjustsFontSizeToFit>
            {t('hogar.maximo', { monto: plata(disponible) })}
          </Texto>
        </View>
        <View style={{ paddingHorizontal: ESPACIO.s + 2, paddingVertical: 4, borderRadius: 999, backgroundColor: fondoChip }}>
          <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={textoChip}>
            {t(`plan.estado.${estado}`)}
          </Texto>
        </View>
      </View>
      <Barra valor={disponible > 0 ? gastado / disponible : 1} color={barra} alto={10} />
      <Texto variante="pequeno" style={{ lineHeight: 19 }}>
        {queda >= 0
          ? t('hogar.llevas', { gastado: plata(gastado), queda: plata(queda), dia: plata(diario) })
          : t('hogar.llevasPasaste', { gastado: plata(gastado), exceso: plata(-queda) })}{' '}
        {t(separas, { monto: plata(plan.separar) })}
      </Texto>
    </Tarjeta>
  );
}

/** Tarjeta de Inicio: patrimonio neto (A7) y acceso a Mi plan. */
function TarjetaPatrimonio({ version }: { version: number }) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const perfil = usePerfil();
  const separador = paisPorCodigo(perfil?.country ?? 'CO').separador;
  const { activos, metas, deudas } = usePlanPersonal(version);
  const neto = patrimonioActual(activos, metas, deudas).neto;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('planPersonal.tarjetaInicio')}: ${formatearCorto(neto, separador)}. ${t('planPersonal.botonInicio')}`}
      onPress={() => router.push('/plan')}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.98 : 1 }] },
        sombraSuave(oscuro),
      ]}>
      <Emoji name="montana" size={34} />
      <View style={{ flex: 1 }}>
        <Texto variante="etiqueta">{t('planPersonal.tarjetaInicio')}</Texto>
        <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 20, lineHeight: 26 }} color={neto < 0 ? colores.errorTexto : colores.texto}>
          {neto < 0 ? '−' : ''}$ {formatearCorto(Math.abs(neto), separador)}
        </Texto>
      </View>
      <View style={{ paddingHorizontal: ESPACIO.s + 4, paddingVertical: 6, borderRadius: 999, backgroundColor: colores.seleccionado }}>
        <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={colores.enlace}>
          {t('planPersonal.botonInicio')}
        </Texto>
      </View>
    </Pressable>
  );
}
