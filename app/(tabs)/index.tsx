import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { primerNombre, usePerfil } from '@/auth/perfil';
import { cerrarSesion } from '@/auth/sesion';
import { Barra } from '@/components/Barra';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { Logo } from '@/components/Logo';
import { Pantalla } from '@/components/Pantalla';
import { Preferencias } from '@/components/Preferencias';
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
import { useCategorias, useMovimientos, type Categoria } from '@/personal/datos';
import { etiquetaDia, nombreMes } from '@/personal/etiquetas';
import { useNombreCategoria, usePlata, useTextosFecha } from '@/personal/ganchos';
import { HojaMovimiento } from '@/personal/HojaMovimiento';
import { periodoDe, SelectorPeriodo, type EleccionPeriodo } from '@/personal/SelectorPeriodo';
import { ALTO_TOCABLE, COLORES_CATEGORIA, ESPACIO, FUENTES, RADIO, useTema, type ColorCategoria } from '@/theme';

/** Lo que guardó el onboarding en profiles.preferences.plan. */
function leerPlan(preferencias: unknown): { ingreso: number; separar: number } | null {
  const plan = (preferencias as { plan?: { objetivo?: string; ingreso?: number; separar?: number } } | null)?.plan;
  if (!plan || plan.objetivo === 'ver' || !plan.ingreso || !plan.separar) return null;
  return { ingreso: plan.ingreso, separar: plan.separar };
}

export default function InicioPersonal() {
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

  const { categorias } = useCategorias();
  const { movimientos, cargando, recargar } = useMovimientos(anterior.desde, periodo.hasta);

  const [filtro, setFiltro] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [hoja, setHoja] = useState<{ abierta: boolean; movimiento: Movimiento | null }>({ abierta: false, movimiento: null });

  const porId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const actual = totalesDelPeriodo(movimientos, periodo);
  const previo = totalesDelPeriodo(movimientos, anterior);
  const variacion = variacionPorcentual(actual.gasto, previo.gasto);
  const nombreAnterior = esMesCompletoOActual(periodo, hoy) ? nombreMes(anterior.desde, textosFecha) : t('periodo.anterior');
  const consejo = consejoDelPeriodo(actual.gastoPorCategoria, {}, mesesDelPeriodo(periodo, hoy));

  // Tarjeta del plan: solo en "Este mes" y si hizo plan en el onboarding.
  const plan = leerPlan(perfil?.preferences);
  const disponible = plan ? disponibleParaGastar(plan.ingreso, plan.separar) : 0;
  const hoyPartes = partes(hoy);

  const tarjetasCategoria = Object.entries(actual.gastoPorCategoria).sort((a, b) => b[1] - a[1]);
  const maximo = Math.max(1, ...tarjetasCategoria.map(([, v]) => v));

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
  const nombre = primerNombre(perfil?.full_name);
  const sinNada = !cargando && enPeriodo.length === 0;

  function tinte(c: Categoria | undefined) {
    const color = COLORES_CATEGORIA[(c?.color as ColorCategoria) in COLORES_CATEGORIA ? (c?.color as ColorCategoria) : 'gris'];
    return oscuro ? color.oscuro : color.claro;
  }

  return (
    <View style={{ flex: 1 }}>
      <Pantalla>
        <Logo />
        <Preferencias />
        <Texto variante="suave">{nombre ? t('personal.saludoNombre', { nombre }) : t('personal.saludo')}</Texto>

        <SelectorPeriodo eleccion={eleccion} hoy={hoy} onCambio={(e) => { setEleccion(e); setFiltro(null); }} />

        {/* Total del período y comparación (A1, A2) */}
        <Tarjeta>
          <Texto variante="suave">{t('inicio.gastaste')}</Texto>
          <Texto variante="cifra">{plata(actual.gasto)}</Texto>
          <Texto variante="pequeno">
            {variacion === null
              ? t('inicio.sinGastosAntes', { periodo: nombreAnterior })
              : variacion >= 0
                ? t('inicio.variacionSube', { porcentaje: variacion, periodo: nombreAnterior })
                : t('inicio.variacionBaja', { porcentaje: Math.abs(variacion), periodo: nombreAnterior })}
          </Texto>
          {actual.ingreso > 0 && (
            <Texto variante="pequeno" color={colores.ingreso}>
              {t('inicio.ingresos', { monto: plata(actual.ingreso) })}
            </Texto>
          )}
        </Tarjeta>

        {/* Plan del mes (A4) */}
        {plan && eleccion.tipo === 'mes' && (() => {
          const queda = leQueda(disponible, actual.gasto);
          const estado = estadoDelPlan(disponible, actual.gasto);
          const color = estado === 'tePasaste' ? colores.error : estado === 'cuidado' ? colores.aviso : colores.accion;
          return (
            <Tarjeta>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Texto variante="fuerte">{t('inicio.plan.titulo')}</Texto>
                <View style={{ paddingHorizontal: ESPACIO.s, paddingVertical: 2, borderRadius: 999, backgroundColor: colores.seleccionado }}>
                  <Texto variante="pequeno" style={{ fontFamily: FUENTES.textoFuerte }} color={estado === 'bien' ? colores.texto : color}>
                    {t(`plan.estado.${estado}`)}
                  </Texto>
                </View>
              </View>
              <Barra valor={disponible > 0 ? actual.gasto / disponible : 1} color={color} />
              <Texto variante="pequeno">{t('inicio.plan.disponible', { monto: plata(disponible) })}</Texto>
              <Texto variante="fuerte">
                {queda >= 0 ? t('inicio.plan.queda', { monto: plata(queda) }) : t('inicio.plan.pasaste', { monto: plata(-queda) })}
              </Texto>
              {queda > 0 && (
                <Texto variante="pequeno">
                  {t('inicio.plan.porDia', {
                    monto: plata(Math.floor(porDia(queda, { diasDelMes: diasDelMes(hoyPartes.anio, hoyPartes.mes), diaDeHoy: hoyPartes.dia }))),
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Texto variante="subtitulo">{t('inicio.porCategoria')}</Texto>
              {filtro && <Boton titulo={t('inicio.quitarFiltro')} variante="texto" onPress={() => setFiltro(null)} />}
            </View>
            {tarjetasCategoria.map(([id, valor]) => {
              const c = porId.get(id);
              const elegida = filtro === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: elegida }}
                  onPress={() => setFiltro(elegida ? null : id)}
                  style={{
                    gap: ESPACIO.xs,
                    padding: ESPACIO.m,
                    borderRadius: RADIO.m,
                    backgroundColor: colores.tarjeta,
                    borderWidth: 2,
                    borderColor: elegida ? colores.accion : oscuro ? 'transparent' : colores.borde,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: tinte(c) }}>
                      <Emoji name={(c?.emoji ?? 'pagina') as NombreEmoji} size={24} />
                    </View>
                    <Texto variante="fuerte" style={{ flex: 1 }}>
                      {nombreCategoria(c)}
                    </Texto>
                    <Texto variante="fuerte">{plata(valor)}</Texto>
                  </View>
                  <Barra valor={valor / maximo} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Consejo del período */}
        {consejo && (
          <Tarjeta style={{ flexDirection: 'row', gap: ESPACIO.m, alignItems: 'flex-start' }}>
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
                  : t('inicio.consejo.mayor', { categoria: nombreCategoria(porId.get(consejo.categoria)), porcentaje: consejo.porcentaje })}
              </Texto>
            </View>
          </Tarjeta>
        )}

        {/* Movimientos agrupados por día */}
        {enPeriodo.length > 0 && (
          <View style={{ gap: ESPACIO.s }}>
            <Texto variante="subtitulo">{t('inicio.movimientos')}</Texto>
            <CampoTexto etiqueta={t('inicio.buscar')} value={busqueda} onChangeText={setBusqueda} autoCorrect={false} returnKeyType="search" />
            {grupos.length === 0 && <Texto variante="suave">{t('inicio.sinResultados')}</Texto>}
            {grupos.map((g) => (
              <View key={g.fecha} style={{ gap: ESPACIO.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: ESPACIO.s }}>
                  <Texto variante="fuerte">{etiquetaDia(g.fecha, hoy, textosFecha)}</Texto>
                  {g.totalGastos > 0 && <Texto variante="suave">{plata(g.totalGastos)}</Texto>}
                </View>
                {g.movimientos.map((m) => {
                  const c = porId.get(m.categoria);
                  return (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      onPress={() => setHoja({ abierta: true, movimiento: m })}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: ESPACIO.s,
                        minHeight: ALTO_TOCABLE + 12,
                        padding: ESPACIO.s,
                        borderRadius: RADIO.m,
                        backgroundColor: pressed ? colores.seleccionado : colores.tarjeta,
                      })}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: tinte(c) }}>
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

        {/* Mientras no exista Ajustes, cerrar sesión vive aquí. Deja espacio para el botón +. */}
        <View style={{ alignItems: 'center', paddingBottom: 72 }}>
          <Boton titulo={t('comun.cerrarSesion')} variante="texto" onPress={cerrarSesion} />
        </View>
      </Pantalla>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('inicio.agregar')}
        onPress={() => setHoja({ abierta: true, movimiento: null })}
        style={({ pressed }) => ({
          position: 'absolute',
          right: ESPACIO.m,
          bottom: ESPACIO.m,
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colores.accion,
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        })}>
        <Texto style={{ color: colores.textoSobreAccion, fontFamily: FUENTES.titulo, fontSize: 32, lineHeight: 36 }}>+</Texto>
      </Pressable>

      <HojaMovimiento
        abierta={hoja.abierta}
        movimiento={hoja.movimiento}
        categorias={categorias}
        hoy={hoy}
        onCerrar={() => setHoja({ abierta: false, movimiento: null })}
        onGuardado={() => {
          setHoja({ abierta: false, movimiento: null });
          recargar();
        }}
      />
    </View>
  );
}
