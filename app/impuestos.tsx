import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Chip } from '@/components/Chip';
import { Emoji } from '@/components/emoji/Emoji';
import { Interruptor } from '@/components/Interruptor';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { SoloSi } from '@/components/SoloSi';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { perfilTributario } from '@/impuestos/perfil';
import { vencimientos, type Vencimiento } from '@/lib/calendarioTributario';
import { diasEntre, hoyEn, sumarDias } from '@/lib/fechas';
import { useNegocio } from '@/negocio/contexto';
import { guardarConfiguracion, type Configuracion, type Regimen } from '@/negocio/datos';
import { fechaCorta } from '@/personal/etiquetas';
import { useTextosFecha } from '@/personal/ganchos';
import { ESPACIO, useTema } from '@/theme';

/** B12 · Calendario de impuestos del negocio: qué toca declarar o pagar a la DIAN y cuándo, con avisos. */
export default function PantallaImpuestos() {
  return (
    <SoloSi parte="negocio" soloDueno>
      <Calendario />
    </SoloSi>
  );
}

function Calendario() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const textosFecha = useTextosFecha();
  const ejemplo = useModoEjemplo();
  const { negocio, parametros, actualizar } = useNegocio();
  const [editar, setEditar] = useState(false);
  const [error, setError] = useState(false);
  const hoy = hoyEn();
  if (!negocio) return null;

  const perfil = perfilTributario(negocio);
  const completo = perfil.regimen !== null && perfil.digito !== null;
  const abierto = editar || !completo;
  const lista = vencimientos(perfil, hoy, sumarDias(hoy, 365), parametros?.calendario);
  const proximo = lista.find((v) => v.fecha);

  async function cambiar(cambios: Partial<Configuracion>, regimen?: Regimen) {
    if (ejemplo) return avisarEjemplo();
    if (!negocio) return;
    setError(false);
    const { error: e } = await guardarConfiguracion(negocio, cambios, regimen);
    if (e) setError(true);
    actualizar();
  }

  const mesLargo = (mes: string) => {
    const [anio, m] = mes.split('-').map(Number);
    return `${textosFecha.mesesLargos[m - 1]} ${anio}`;
  };
  const periodoTexto = (v: Vencimiento) => {
    const [a1, m1] = v.periodo.desde.split('-').map(Number);
    const [a2, m2] = v.periodo.hasta.split('-').map(Number);
    if (v.periodo.desde === `${a2 - 1}-01` && m2 === 12 && a1 === a2 - 1) return t('impuestos.anio', { anio: a2 - 1 });
    if (v.periodo.desde === v.periodo.hasta) return mesLargo(v.periodo.desde);
    return `${textosFecha.mesesCortos[m1 - 1]}–${textosFecha.mesesCortos[m2 - 1]} ${a2}`;
  };
  const falta = (fecha: string) => {
    const d = diasEntre(hoy, fecha);
    return d === 0 ? t('impuestos.hoy') : d === 1 ? t('impuestos.manana') : t('impuestos.faltan', { count: d });
  };

  // Agrupa por mes de vencimiento.
  const porMes = new Map<string, Vencimiento[]>();
  for (const v of lista) porMes.set(v.mes, [...(porMes.get(v.mes) ?? []), v]);

  return (
    <PantallaAjuste titulo={t('impuestos.titulo')} detalle={t('impuestos.detalle')}>
      {proximo?.fecha && !abierto && (
        <Tarjeta style={{ gap: ESPACIO.xs }}>
          <Texto variante="etiqueta">{t('impuestos.proximo')}</Texto>
          <Texto variante="subtitulo">{t(`impuestos.obligaciones.${proximo.obligacion}.nombre`)}</Texto>
          <Texto variante="heroe" numberOfLines={1} adjustsFontSizeToFit>
            {fechaCorta(proximo.fecha, textosFecha, true)}
          </Texto>
          <Texto variante="fuerte" color={diasEntre(hoy, proximo.fecha) <= 3 ? colores.avisoTexto : colores.enlace}>
            {falta(proximo.fecha)} · {periodoTexto(proximo)}
          </Texto>
        </Tarjeta>
      )}

      {abierto ? (
        <Tarjeta style={{ gap: ESPACIO.m }}>
          <View style={{ gap: ESPACIO.xs }}>
            <Texto variante="subtitulo">{t('impuestos.tusDatos')}</Texto>
            <Texto variante="pequeno">{t('impuestos.tusDatosDetalle')}</Texto>
          </View>
          <View style={{ gap: ESPACIO.s }}>
            <Texto variante="etiqueta">{t('impuestos.regimen')}</Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
              {(['simple', 'ordinario', 'natural'] as const).map((r) => (
                <Chip key={r} texto={t(`negocioApp.regimenes.${r}`)} elegido={perfil.regimen === r} onPress={() => cambiar({}, r)} />
              ))}
            </View>
          </View>
          <View style={{ gap: ESPACIO.s }}>
            <Texto variante="etiqueta">{t('impuestos.digito')}</Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
                <Chip key={d} texto={String(d)} accessibilityLabel={t('impuestos.digitoEs', { d })} elegido={perfil.digito === d} onPress={() => cambiar({ digito_nit: d })} />
              ))}
            </View>
            <Texto variante="pequeno" color={colores.textoSuave}>
              {t('impuestos.digitoAyuda')}
            </Texto>
          </View>
          <FilaInterruptor titulo={t('impuestos.responsableIva')} detalle={t('impuestos.responsableIvaDetalle')} encendido={perfil.responsableIva} onCambio={(v) => cambiar({ responsable_iva: v })} />
          {perfil.responsableIva && perfil.regimen !== 'simple' && (
            <View style={{ gap: ESPACIO.s }}>
              <Texto variante="etiqueta">{t('impuestos.periodoIva')}</Texto>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
                {(['bimestral', 'cuatrimestral'] as const).map((p) => (
                  <Chip key={p} texto={t(`impuestos.periodos.${p}`)} elegido={perfil.periodoIva === p} onPress={() => cambiar({ periodo_iva: p })} />
                ))}
              </View>
              <Texto variante="pequeno" color={colores.textoSuave}>
                {t('impuestos.periodoIvaAyuda')}
              </Texto>
            </View>
          )}
          <FilaInterruptor titulo={t('impuestos.retencion')} detalle={t('impuestos.retencionDetalle')} encendido={perfil.agenteRetencion} onCambio={(v) => cambiar({ agente_retencion: v })} />
          {completo && <Boton titulo={t('impuestos.listo')} onPress={() => setEditar(false)} />}
        </Tarjeta>
      ) : (
        <Boton titulo={t('impuestos.cambiarDatos')} variante="secundario" onPress={() => setEditar(true)} />
      )}

      {error && <Aviso mensaje={t('impuestos.error')} />}

      {!abierto && lista.length === 0 && <Texto variante="suave">{t('impuestos.nada')}</Texto>}

      {!abierto &&
        [...porMes.entries()].map(([mes, items]) => (
          <View key={mes} style={{ gap: ESPACIO.s }}>
            <Texto variante="subtitulo">{mesLargo(mes)}</Texto>
            {items.map((v) => (
              <Tarjeta key={`${v.obligacion}-${v.mes}`} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
                <Emoji name="calendario" size={32} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Texto variante="fuerte">{t(`impuestos.obligaciones.${v.obligacion}.nombre`)}</Texto>
                  <Texto variante="pequeno">
                    {t(`impuestos.obligaciones.${v.obligacion}.que`, { periodo: periodoTexto(v) })}
                  </Texto>
                  {!v.fecha && (
                    <Texto variante="pequeno" color={colores.textoSuave}>
                      {t(`impuestos.obligaciones.${v.obligacion}.cuando`)}
                    </Texto>
                  )}
                </View>
                {v.fecha && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Texto variante="fuerte">{fechaCorta(v.fecha, textosFecha)}</Texto>
                    <Texto variante="pequeno">{falta(v.fecha)}</Texto>
                  </View>
                )}
              </Tarjeta>
            ))}
          </View>
        ))}

      <Texto variante="pequeno" color={colores.textoSuave}>
        {t('impuestos.nota')}
      </Texto>
    </PantallaAjuste>
  );
}

function FilaInterruptor({ titulo, detalle, encendido, onCambio }: { titulo: string; detalle: string; encendido: boolean; onCambio: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="fuerte">{titulo}</Texto>
        <Texto variante="pequeno">{detalle}</Texto>
      </View>
      <Interruptor etiqueta={titulo} encendido={encendido} onCambio={onCambio} />
    </View>
  );
}
