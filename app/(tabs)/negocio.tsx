import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Boton } from '@/components/Boton';
import { Chip } from '@/components/Chip';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaApp } from '@/components/PantallaApp';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { hoyEn, partes, periodoAnterior } from '@/lib/fechas';
import { estadoRecurrente } from '@/lib/contactos';
import { TIPOS_NEGOCIO } from '@/lib/negocio';
import { cambiarModoEjemplo } from '@/ejemplo/modo';
import { useNegocio } from '@/negocio/contexto';
import { crearMiNegocio } from '@/negocio/datos';
import { EMOJI_TIPO } from '@/negocio/HojaMovNegocio';
import { calcularResumen } from '@/negocio/resumen';
import { useTributario } from '@/impuestos/ganchos';
import { etiquetaDia } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { periodoDe, SelectorPeriodo, type EleccionPeriodo } from '@/personal/SelectorPeriodo';
import { ALTO_TOCABLE, COLORES_CATEGORIA, ESPACIO, FUENTES, PALETA, sombraSuave, useTema } from '@/theme';
import { SoloSi } from '@/components/SoloSi';
import { TarjetaAvisos } from '@/notificaciones/TarjetaAvisos';
import { VistaVendedor } from '@/pos/VistaVendedor';

/** Negocio · Resumen (docs/specs/03-negocio.md, §2): ¿estoy ganando plata? */
function ResumenNegocioContenido() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const { negocio, cuentas, tarjetas, movimientos, traslados, recurrentes, ventas, cargando, abrirHoja, actualizar } = useNegocio();
  const tributario = useTributario();
  const hoy = hoyEn();
  const [eleccion, setEleccion] = useState<EleccionPeriodo>({ tipo: 'mes' });
  const [filtro, setFiltro] = useState<'todos' | 'pendientes'>('todos');
  const [verTodos, setVerTodos] = useState(false);
  const [creando, setCreando] = useState(false);

  if (!cargando && !negocio) {
    return (
      <PantallaApp>
        <Tarjeta style={{ alignItems: 'center', paddingVertical: ESPACIO.xl }}>
          <Emoji name="tienda" size={72} />
          <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
            {t('negocioApp.resumen.armaTitulo')}
          </Texto>
          <Texto variante="suave" style={{ textAlign: 'center' }}>
            {t('negocioApp.resumen.armaDetalle')}
          </Texto>
          <Boton titulo={t('ejemplo.verCorto')} variante="secundario" onPress={() => cambiarModoEjemplo(true)} />
          <Boton
            titulo={t('negocioApp.resumen.armaBoton')}
            cargando={creando}
            onPress={async () => {
              setCreando(true);
              const r = await crearMiNegocio(t('onboarding.porDefecto.negocio'), { efectivo: t('onboarding.porDefecto.efectivo'), bodega: t('onboarding.porDefecto.bodega') });
              setCreando(false);
              actualizar();
              if (!r.error) router.push('/arranque');
            }}
          />
        </Tarjeta>
      </PantallaApp>
    );
  }
  if (!negocio) return <PantallaApp>{null}</PantallaApp>;

  const periodo = periodoDe(eleccion, hoy);
  const r = calcularResumen(
    { cuentas: cuentas.map((c) => ({ id: c.id, saldoInicial: c.saldoInicial })), movimientos, traslados, configuracion: negocio.configuracion, ventas },
    periodo,
    periodoAnterior(periodo, hoy),
    tributario,
  );
  const { resultados } = r;
  // B10 · Pagos recurrentes vencidos, de hoy o de los próximos días.
  const porPagarYa = recurrentes.filter((x) => x.activo && ['vencido', 'hoy', 'proximo'].includes(estadoRecurrente(x, movimientos, hoy).estado));
  const margen = resultados.ventas > 0 ? Math.round((resultados.neta / resultados.ventas) * 1000) / 10 : 0;
  const colorSalud = r.salud.estado === 'saludable' ? colores.ingresoTexto : r.salud.estado === 'atencion' ? colores.avisoTexto : colores.errorTexto;
  const nombreCuenta = new Map([...cuentas.map((c) => [c.id, c.nombre] as const), ...tarjetas.map((tj) => [tj.id, tj.nombre] as const)]);
  const lista = movimientos.filter((m) => (filtro === 'pendientes' ? !m.pagado : m.fecha >= periodo.desde && m.fecha <= periodo.hasta));
  const visibles = verTodos ? lista : lista.slice(0, 8);
  const mesLargo = textosFecha.mesesLargos[partes(periodo.desde).mes - 1];
  const tinte = (entra: boolean) => (oscuro ? COLORES_CATEGORIA[entra ? 'menta' : 'azul'].oscuro : COLORES_CATEGORIA[entra ? 'menta' : 'azul'].claro);

  return (
    <PantallaApp>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <View style={{ flex: 1 }}>
          <SelectorPeriodo eleccion={eleccion} hoy={hoy} onCambio={setEleccion} />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/pos')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: ESPACIO.s,
            minHeight: ALTO_TOCABLE + 4,
            paddingHorizontal: ESPACIO.m,
            borderRadius: 999,
            backgroundColor: oscuro ? PALETA.blanco : PALETA.noche,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}>
          <Emoji name="tienda" size={18} />
          <Texto style={{ fontFamily: FUENTES.textoFuerte }} color={oscuro ? PALETA.noche : PALETA.blanco}>
            {t('negocioApp.pos')}
          </Texto>
        </Pressable>
      </View>

      {/* Nombre del negocio → arranque */}
      <Pressable accessibilityRole="button" accessibilityHint={t('negocioApp.resumen.editarArranque')} onPress={() => router.push('/arranque')} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4 }}>
        <View style={[{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.tarjeta }, sombraSuave(oscuro)]}>
          <Emoji name="tienda" size={30} />
        </View>
        <View style={{ flex: 1 }}>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 19, lineHeight: 25 }}>{negocio.nombre} ✎</Texto>
          <Texto variante="pequeno">{t('negocioApp.resumen.cifrasAHoy', { periodo: mesLargo.replace(/^./, (l) => l.toUpperCase()) })}</Texto>
        </View>
      </Pressable>

      <Boton titulo={`${t('pos.vender')}  →`} onPress={() => router.push('/pos')} />
      <TarjetaAvisos />

      {!negocio.configuracion.arranque_listo && (
        <View style={{ gap: ESPACIO.s, padding: ESPACIO.l, borderRadius: 20, backgroundColor: colores.seleccionado }}>
          <View style={{ flexDirection: 'row', gap: ESPACIO.m, alignItems: 'center' }}>
            <Emoji name="cohete" size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Texto variante="fuerte">{t('negocioApp.resumen.armaTitulo')}</Texto>
              <Texto variante="pequeno">{t('negocioApp.resumen.armaDetalle')}</Texto>
            </View>
          </View>
          <Boton titulo={t('negocioApp.resumen.armaBoton')} onPress={() => router.push('/arranque')} />
          <Boton titulo={t('ejemplo.verCorto')} variante="texto" onPress={() => cambiarModoEjemplo(true)} />
        </View>
      )}

      {porPagarYa.length > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/recurrentes')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.avisoFondo }}>
          <Emoji name="campana" size={30} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="medio" color={colores.avisoTexto}>
              {t('recurrentes.avisoResumen', { count: porPagarYa.length, nombres: porPagarYa.map((x) => x.nombre).join(', ') })}
            </Texto>
            <Texto variante="fuerte" color={colores.enlace}>
              {t('recurrentes.verPagos')} →
            </Texto>
          </View>
        </Pressable>
      )}

      {/* Utilidad neta del período (B5 con impuestos B7) */}
      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="medio" color={colores.textoSuave}>
          {t('negocioApp.resumen.utilidad')}
        </Texto>
        <Texto variante="heroe" color={resultados.neta >= 0 ? colores.ingresoTexto : colores.errorTexto} numberOfLines={1} adjustsFontSizeToFit>
          {resultados.neta < 0 ? `−${plata(-Math.round(resultados.neta))}` : plata(Math.round(resultados.neta))}
        </Texto>
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: ESPACIO.s + 4, paddingVertical: 4, borderRadius: 999, backgroundColor: resultados.neta >= 0 ? colores.seleccionado : colores.errorFondo }}>
          <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={resultados.neta >= 0 ? colores.enlace : colores.errorTexto}>
            {resultados.neta >= 0 ? t('negocioApp.resumen.ganando', { margen: String(margen).replace('.', ',') }) : t('negocioApp.resumen.perdiendo')}
          </Texto>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: ESPACIO.s + 4 }}>
        <Tarjeta style={{ flex: 1, padding: ESPACIO.m, gap: 2 }}>
          <Texto variante="etiqueta">{t('negocioApp.resumen.ventas')}</Texto>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 19, lineHeight: 25 }} numberOfLines={1} adjustsFontSizeToFit>
            {plata(resultados.ventas)}
          </Texto>
          {r.variacionVentas !== null && (
            <Texto variante="pequeno" color={r.variacionVentas >= 0 ? colores.ingresoTexto : colores.errorTexto}>
              {r.variacionVentas >= 0 ? '+' : '−'}
              {Math.abs(r.variacionVentas)}%
            </Texto>
          )}
        </Tarjeta>
        <Tarjeta style={{ flex: 1, padding: ESPACIO.m, gap: 2 }}>
          <Texto variante="etiqueta">{t('negocioApp.resumen.gastos')}</Texto>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 19, lineHeight: 25 }} numberOfLines={1} adjustsFontSizeToFit>
            {plata(Math.round(resultados.costoVentas + resultados.fijos + resultados.variables))}
          </Texto>
        </Tarjeta>
      </View>

      {/* Caja (B4), lo que te deben y lo que debes (B8b) */}
      <Tarjeta>
        <Texto variante="etiqueta">{t('negocioApp.resumen.caja')}</Texto>
        <Texto variante="cifra">{plata(r.caja)}</Texto>
        {r.mesesCaja !== null && (
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: ESPACIO.s + 4, paddingVertical: 4, borderRadius: 999, backgroundColor: colores.seleccionado }}>
            <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={colores.enlace}>
              {t('negocioApp.resumen.meses', { meses: String(Math.round(r.mesesCaja * 10) / 10).replace('.', ',') })}
            </Texto>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: ESPACIO.m, marginTop: ESPACIO.s }}>
          <View style={{ flex: 1 }}>
            <Texto variante="etiqueta">{t('negocioApp.resumen.teDeben')}</Texto>
            <Texto variante="fuerte" color={colores.ingresoTexto}>
              {plata(r.porCobrar)}
            </Texto>
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="etiqueta">{t('negocioApp.resumen.debes')}</Texto>
            <Texto variante="fuerte" color={r.porPagar > 0 ? colores.errorTexto : colores.texto}>
              {plata(r.porPagar)}
            </Texto>
          </View>
        </View>
        <Texto variante="pequeno">{t('negocioApp.resumen.proyeccion', { monto: plata(r.proyeccion) })}</Texto>
      </Tarjeta>

      {/* Salud del negocio (B8c) y punto de equilibrio (B8) */}
      <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
        <View style={{ width: 92, height: 92, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${t('negocioApp.resumen.salud')}: ${r.salud.puntaje}`}>
          <Svg width={92} height={92} style={{ position: 'absolute' }}>
            <Circle cx={46} cy={46} r={38} stroke={colores.relleno} strokeWidth={10} fill="none" />
            <Circle
              cx={46}
              cy={46}
              r={38}
              stroke={colorSalud}
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(2 * Math.PI * 38 * r.salud.puntaje) / 100} ${2 * Math.PI * 38}`}
              transform="rotate(-90 46 46)"
            />
          </Svg>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 26, lineHeight: 32 }}>{r.salud.puntaje}</Texto>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="etiqueta">{t('negocioApp.resumen.salud')}</Texto>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 19, lineHeight: 25 }} color={colorSalud}>
            {t(`negocioApp.resumen.estados.${r.salud.estado}`)}
          </Texto>
          <Texto variante="pequeno">{t(`negocioApp.resumen.saludDetalle.${r.salud.estado}`)}</Texto>
        </View>
      </Tarjeta>
      <Texto variante="suave">
        {r.equilibrio === null
          ? t('negocioApp.resumen.sinMargen')
          : `${t('negocioApp.resumen.equilibrio', { monto: plata(Math.round(r.equilibrio)) })} ${
              resultados.ventas >= r.equilibrio
                ? t('negocioApp.resumen.equilibrioSuperado', { monto: plata(Math.round(resultados.ventas - r.equilibrio)) })
                : t('negocioApp.resumen.equilibrioFalta', { monto: plata(Math.round(r.equilibrio - resultados.ventas)) })
            }`}
      </Texto>

      {/* Movimientos */}
      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="subtitulo">{t('negocioApp.resumen.movimientos')}</Texto>
        <View style={{ flexDirection: 'row', gap: ESPACIO.s }}>
          <Chip texto={t('negocioApp.resumen.filtros.todos')} elegido={filtro === 'todos'} onPress={() => setFiltro('todos')} />
          <Chip texto={t('negocioApp.resumen.filtros.pendientes')} elegido={filtro === 'pendientes'} onPress={() => setFiltro('pendientes')} />
        </View>
        {lista.length === 0 && <Texto variante="suave">{t('negocioApp.resumen.vacio')}</Texto>}
        {visibles.map((m) => {
          const entra = TIPOS_NEGOCIO[m.tipo].entra;
          const detalle = !m.pagado
            ? m.tipo === 'venta'
              ? t('negocioApp.resumen.porCobrar')
              : t('negocioApp.resumen.porPagar')
            : m.tarjeta
              ? t('negocioApp.resumen.conTarjeta', { tarjeta: nombreCuenta.get(m.tarjeta) ?? '' })
              : (nombreCuenta.get(m.cuenta ?? '') ?? '');
          return (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              onPress={() => abrirHoja(m)}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 72, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.98 : 1 }] },
                sombraSuave(oscuro),
              ]}>
              <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tinte(entra) }}>
                <Emoji name={EMOJI_TIPO[m.tipo]} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="etiqueta" numberOfLines={1}>
                  {t(`negocioApp.tipos.${m.tipo}.nombre`)} · {etiquetaDia(m.fecha, hoy, textosFecha)}
                </Texto>
                <Texto variante="fuerte" numberOfLines={1}>
                  {m.concepto || t(`negocioApp.tipos.${m.tipo}.nombre`)}
                </Texto>
                <Texto variante="pequeno" numberOfLines={1} color={!m.pagado ? colores.avisoTexto : undefined}>
                  {detalle}
                </Texto>
              </View>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }} color={entra ? colores.ingresoTexto : colores.texto}>
                {entra ? `+ ${plata(m.monto)}` : plata(m.monto)}
              </Texto>
            </Pressable>
          );
        })}
        {lista.length > 8 && (
          <Boton titulo={verTodos ? t('negocioApp.resumen.verMenos') : t('negocioApp.resumen.verTodos')} variante="texto" onPress={() => setVerTodos((v) => !v)} />
        )}
      </View>
    </PantallaApp>
  );
}

export default function ResumenNegocio() {
  const { negocio } = useNegocio();
  return (
    <SoloSi parte="negocio">{negocio?.rol === 'seller' ? <VistaVendedor /> : <ResumenNegocioContenido />}</SoloSi>
  );
}
