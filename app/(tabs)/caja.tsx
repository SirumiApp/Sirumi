import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { Barra } from '@/components/Barra';
import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaApp } from '@/components/PantallaApp';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { hoyEn } from '@/lib/fechas';
import { flujoDelPeriodo } from '@/lib/informes';
import { cajaTotal, estadoTarjeta, saldoCuenta } from '@/lib/negocio';
import { useNegocio } from '@/negocio/contexto';
import { borrarTraslado } from '@/negocio/datos';
import { HojaTraslado } from '@/negocio/HojaTraslado';
import { conSigno, FilaCifra, ListaFilas } from '@/negocio/Piezas';
import { etiquetaDia } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { periodoDe, SelectorPeriodo, type EleccionPeriodo } from '@/personal/SelectorPeriodo';
import { ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';
import { SoloSi } from '@/components/SoloSi';

/** Negocio · Caja (spec 03, §4 y §5.2): saldo de cada cuenta (B2), total (B4), tarjetas (B3), mover plata y flujo de caja (B6). */
function CajaContenido() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const { negocio, cuentas, tarjetas, movimientos, traslados, actualizar } = useNegocio();
  const [hoja, setHoja] = useState(false);
  const [eleccion, setEleccion] = useState<EleccionPeriodo>({ tipo: 'mes' });
  const [verTodos, setVerTodos] = useState(false);
  const hoy = hoyEn();
  const base = cuentas.map((c) => ({ id: c.id, saldoInicial: c.saldoInicial }));
  const total = cajaTotal(base, movimientos, traslados);
  const flujo = flujoDelPeriodo(periodoDe(eleccion, hoy), base, movimientos, traslados);
  const nombre = new Map([...cuentas.map((c) => [c.id, c.nombre] as const), ...tarjetas.map((tj) => [tj.id, tj.nombre] as const)]);
  const visibles = verTodos ? traslados : traslados.slice(0, 5);

  function preguntarBorrar(id: string) {
    Alert.alert(t('negocioApp.traslado.borrar'), t('negocioApp.traslado.confirmarBorrar'), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      {
        text: t('negocioApp.traslado.siBorrar'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await borrarTraslado(id);
          if (error) Alert.alert(t('negocioApp.traslado.error'));
          actualizar();
        },
      },
    ]);
  }

  return (
    <PantallaApp>
      <View style={{ gap: ESPACIO.xs, marginTop: ESPACIO.s }}>
        <Texto variante="titulo">{t('negocioApp.caja.titulo')}</Texto>
        <Texto variante="suave">{t('negocioApp.caja.detalle')}</Texto>
      </View>

      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="medio" color={colores.textoSuave}>
          {t('negocioApp.caja.total')}
        </Texto>
        <Texto variante="heroe" color={total < 0 ? colores.errorTexto : colores.texto} numberOfLines={1} adjustsFontSizeToFit>
          {total < 0 ? `−${plata(-total)}` : plata(total)}
        </Texto>
      </View>

      {cuentas.length > 0 && negocio && <Boton titulo={t('negocioApp.caja.mover')} onPress={() => setHoja(true)} />}

      <Texto variante="subtitulo">{t('negocioApp.caja.cuentas')}</Texto>
      <View style={[{ backgroundColor: colores.tarjeta, borderRadius: 20, paddingHorizontal: ESPACIO.m, paddingVertical: ESPACIO.xs }, sombraSuave(oscuro)]}>
        {cuentas.map((c) => {
          const saldo = saldoCuenta({ id: c.id, saldoInicial: c.saldoInicial }, movimientos, traslados);
          return (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 60 }}>
              <Emoji name={c.tipo === 'billetera' ? 'celular' : c.tipo === 'efectivo' ? 'billete' : 'banco'} size={30} />
              <Texto variante="fuerte" style={{ flex: 1 }}>
                {c.nombre}
              </Texto>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }} color={saldo < 0 ? colores.errorTexto : colores.texto}>
                {saldo < 0 ? `−${plata(-saldo)}` : plata(saldo)}
              </Texto>
            </View>
          );
        })}
      </View>

      {tarjetas.length > 0 && <Texto variante="subtitulo">{t('negocioApp.caja.tarjetas')}</Texto>}
      {tarjetas.map((tj) => {
        const e = estadoTarjeta({ id: tj.id, cupo: tj.cupo, deudaInicial: tj.deudaInicial }, movimientos, traslados);
        const color = e.alerta === 'ok' ? colores.accion : colores.error;
        return (
          <Tarjeta key={tj.id} style={{ gap: ESPACIO.s }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4 }}>
              <Emoji name="tarjeta" size={30} />
              <View style={{ flex: 1 }}>
                <Texto variante="fuerte">{tj.nombre}</Texto>
                <Texto variante="pequeno">{t('negocioApp.caja.deudaDe', { deuda: plata(e.deuda), cupo: plata(tj.cupo) })}</Texto>
              </View>
            </View>
            <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }} color={e.alerta === 'ok' ? colores.ingresoTexto : colores.errorTexto}>
              {t('negocioApp.caja.disponible', { monto: plata(e.disponible) })}
            </Texto>
            <Barra valor={tj.cupo > 0 ? e.deuda / tj.cupo : 0} color={color} alto={8} />
            {e.alerta !== 'ok' && (
              <Texto variante="pequeno" color={colores.errorTexto}>
                {e.alerta === 'excedida' ? t('negocioApp.caja.excedida') : t('negocioApp.caja.alta')}
              </Texto>
            )}
          </Tarjeta>
        );
      })}

      {/* Historial de traslados */}
      <Texto variante="subtitulo">{t('negocioApp.caja.historial')}</Texto>
      {traslados.length === 0 && <Texto variante="suave">{t('negocioApp.caja.sinTraslados')}</Texto>}
      {visibles.map((tr) => (
        <Pressable
          key={tr.id ?? `${tr.fecha}-${tr.desde}-${tr.monto}`}
          accessibilityRole="button"
          accessibilityHint={t('negocioApp.traslado.borrar')}
          onLongPress={() => tr.id && preguntarBorrar(tr.id)}
          onPress={() => tr.id && preguntarBorrar(tr.id)}
          style={({ pressed }) => [
            { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 64, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.98 : 1 }] },
            sombraSuave(oscuro),
          ]}>
          <Emoji name={tr.haciaTarjeta ? 'tarjeta' : 'cambio'} size={28} />
          <View style={{ flex: 1 }}>
            <Texto variante="fuerte" numberOfLines={1}>
              {tr.haciaTarjeta
                ? t('negocioApp.caja.pagoTarjeta', { tarjeta: nombre.get(tr.haciaTarjeta) ?? '' })
                : `${nombre.get(tr.desde) ?? ''} → ${nombre.get(tr.haciaCuenta ?? '') ?? ''}`}
            </Texto>
            <Texto variante="pequeno" numberOfLines={1}>
              {etiquetaDia(tr.fecha, hoy, textosFecha)}
              {tr.haciaTarjeta ? ` · ${nombre.get(tr.desde) ?? ''}` : ''}
              {tr.nota ? ` · ${tr.nota}` : ''}
            </Texto>
          </View>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }}>{plata(tr.monto)}</Texto>
        </Pressable>
      ))}
      {traslados.length > 5 && <Boton titulo={verTodos ? t('negocioApp.resumen.verMenos') : t('negocioApp.resumen.verTodos')} variante="texto" onPress={() => setVerTodos((v) => !v)} />}

      {/* B6 · Flujo de caja del período */}
      <View style={{ gap: ESPACIO.xs, marginTop: ESPACIO.s }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
          <Texto variante="subtitulo" style={{ flex: 1 }}>
            {t('negocioApp.caja.flujo')}
          </Texto>
          <SelectorPeriodo eleccion={eleccion} hoy={hoy} onCambio={setEleccion} />
        </View>
        <Texto variante="pequeno">{t('negocioApp.caja.flujoDetalle')}</Texto>
      </View>
      <ListaFilas>
        <FilaCifra titulo={t('negocioApp.caja.inicio')} valor={conSigno(plata, flujo.inicio)} />
        <FilaCifra titulo={t('negocioApp.caja.operacion')} ayuda={t('negocioApp.caja.operacionAyuda')} valor={conSigno(plata, flujo.operacion)} color={flujo.operacion < 0 ? colores.errorTexto : colores.ingresoTexto} />
        <FilaCifra titulo={t('negocioApp.caja.inversion')} ayuda={t('negocioApp.caja.inversionAyuda')} valor={conSigno(plata, flujo.inversion)} />
        <FilaCifra titulo={t('negocioApp.caja.financiacion')} ayuda={t('negocioApp.caja.financiacionAyuda')} valor={conSigno(plata, flujo.financiacion)} />
        <FilaCifra titulo={t('negocioApp.caja.cierre')} valor={conSigno(plata, flujo.cierre)} fuerte color={flujo.cierre < 0 ? colores.errorTexto : undefined} />
      </ListaFilas>

      {negocio && (
        <HojaTraslado
          abierta={hoja}
          negocioId={negocio.id}
          cuentas={cuentas}
          tarjetas={tarjetas}
          movimientos={movimientos}
          traslados={traslados}
          hoy={hoy}
          onCerrar={() => setHoja(false)}
          onGuardado={() => {
            setHoja(false);
            actualizar();
          }}
        />
      )}
    </PantallaApp>
  );
}

export default function Caja() {
  return (
    <SoloSi parte="negocio">
      <CajaContenido />
    </SoloSi>
  );
}
