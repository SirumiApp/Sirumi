import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { estadoRecurrente, resumenRecurrentes, type EstadoRecurrente, type Recurrente } from '@/lib/contactos';
import { hoyEn } from '@/lib/fechas';
import { useNegocio } from '@/negocio/contexto';
import { HojaRecurrente } from '@/negocio/HojaRecurrente';
import { fechaCorta } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { ALTO_TOCABLE, ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

/** Pagos recurrentes del negocio (spec 03, §3; regla B10): la app recuerda y la persona confirma. */
export default function Recurrentes() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const ejemplo = useModoEjemplo();
  const { negocio, cuentas, recurrentes, movimientos, abrirHoja, actualizar } = useNegocio();
  const [hoja, setHoja] = useState<{ abierta: boolean; recurrente: Recurrente | null }>({ abierta: false, recurrente: null });
  const hoy = hoyEn();
  const resumen = resumenRecurrentes(recurrentes, movimientos, hoy);

  const colorEstado = (e: EstadoRecurrente) =>
    e === 'pagado' ? colores.ingresoTexto : e === 'vencido' || e === 'hoy' ? colores.errorTexto : e === 'proximo' ? colores.avisoTexto : colores.textoSuave;

  function abrirForm(r: Recurrente | null) {
    if (ejemplo) return avisarEjemplo();
    setHoja({ abierta: true, recurrente: r });
  }

  return (
    <PantallaAjuste titulo={t('recurrentes.titulo')} detalle={t('recurrentes.detalle')}>
      {recurrentes.length === 0 ? (
        <View style={{ alignItems: 'center', gap: ESPACIO.s, paddingVertical: ESPACIO.l }}>
          <Emoji name="repetir" size={64} />
          <Texto variante="suave" style={{ textAlign: 'center' }}>
            {t('recurrentes.vacio')}
          </Texto>
        </View>
      ) : (
        <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
          <Emoji name={resumen.faltan === 0 ? 'check' : 'calendario'} size={36} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="fuerte">
              {resumen.faltan === 0 ? t('recurrentes.alDia') : t('recurrentes.faltan', { count: resumen.faltan, monto: plata(resumen.montoFaltante) })}
            </Texto>
            <Texto variante="pequeno">{t('recurrentes.total', { monto: plata(resumen.totalMensual) })}</Texto>
          </View>
        </Tarjeta>
      )}

      {recurrentes.map((r) => {
        const e = estadoRecurrente(r, movimientos, hoy);
        const pagado = e.estado === 'pagado';
        const textoEstado = !r.activo
          ? t('recurrentes.pausado')
          : e.estado === 'despues'
            ? t('recurrentes.estados.despues', { fecha: fechaCorta(e.fecha, textosFecha) })
            : t(`recurrentes.estados.${e.estado}`, { count: Math.abs(e.dias), dias: Math.abs(e.dias) });
        return (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityHint={t('recurrentes.editar')}
            onPress={() => abrirForm(r)}
            style={({ pressed }) => [
              { gap: ESPACIO.s, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, opacity: r.activo ? 1 : 0.6, transform: [{ scale: pressed ? 0.98 : 1 }] },
              sombraSuave(oscuro),
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4 }}>
              <Emoji name={r.tipo === 'fijo' ? 'edificio' : 'camion'} size={30} />
              <View style={{ flex: 1 }}>
                <Texto variante="fuerte" numberOfLines={1}>
                  {r.nombre}
                </Texto>
                <Texto variante="pequeno">{t('recurrentes.cadaMes', { dia: r.dia })}</Texto>
                <Texto variante="pequeno" color={r.activo ? colorEstado(e.estado) : undefined} style={{ fontFamily: FUENTES.textoFuerte }}>
                  {textoEstado}
                </Texto>
              </View>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }}>{plata(r.monto)}</Texto>
            </View>
            {r.activo && (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  pagado
                    ? Alert.alert(t('recurrentes.pagado'), t('recurrentes.yaPagado'))
                    : abrirHoja(null, { tipo: r.tipo, monto: r.monto, concepto: r.nombre, cuenta: r.cuenta ?? undefined, recurrente: r.id })
                }
                style={({ pressed }) => ({
                  minHeight: ALTO_TOCABLE,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pagado ? colores.seleccionado : colores.accion,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <Texto variante="fuerte" color={pagado ? colores.ingresoTexto : colores.textoSobreAccion}>
                  {pagado ? t('recurrentes.pagado') : t('recurrentes.registrar')}
                </Texto>
              </Pressable>
            )}
          </Pressable>
        );
      })}

      {negocio && <Boton titulo={t('recurrentes.agregar')} variante="secundario" onPress={() => abrirForm(null)} />}

      {negocio && (
        <HojaRecurrente
          abierta={hoja.abierta}
          recurrente={hoja.recurrente}
          negocioId={negocio.id}
          cuentas={cuentas}
          onCerrar={() => setHoja({ abierta: false, recurrente: null })}
          onGuardado={() => {
            setHoja({ abierta: false, recurrente: null });
            actualizar();
          }}
        />
      )}
    </PantallaAjuste>
  );
}
