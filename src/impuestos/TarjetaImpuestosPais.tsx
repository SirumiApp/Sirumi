import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { Interruptor } from '@/components/Interruptor';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { impuestoDelPais } from '@/lib/impuestosPais';
import { useNegocio } from '@/negocio/contexto';
import { guardarConfiguracion } from '@/negocio/datos';
import { ALTO_TOCABLE, ESPACIO } from '@/theme';

import { useTributario } from './ganchos';

const leerPorcentaje = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined;
};

/** B13 · Fuera de Colombia: el impuesto a las ventas del país y el % sobre la utilidad que dice el contador. */
export function TarjetaImpuestosPais() {
  const { t } = useTranslation();
  const ejemplo = useModoEjemplo();
  const { negocio, actualizar } = useNegocio();
  const trib = useTributario();
  const conf = negocio?.configuracion ?? {};
  const general = impuestoDelPais(trib.pais).tasa;
  const nombre = t(`impuestosPais.nombres.${trib.impuesto}`);
  const [ventas, setVentas] = useState(conf.tasa_ventas !== undefined ? String(conf.tasa_ventas) : '');
  const [utilidad, setUtilidad] = useState(conf.tasa_utilidad !== undefined ? String(conf.tasa_utilidad) : '');
  if (!negocio) return null;

  async function guardar(cambios: Parameters<typeof guardarConfiguracion>[1]) {
    if (ejemplo) return avisarEjemplo();
    if (!negocio) return;
    await guardarConfiguracion(negocio, cambios);
    actualizar();
  }

  return (
    <Tarjeta style={{ gap: ESPACIO.m }}>
      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="subtitulo">{t('impuestosPais.titulo', { pais: t(`paises.${trib.pais}` as never) })}</Texto>
        <Texto variante="pequeno">{general !== null ? t('impuestosPais.general', { impuesto: nombre, tasa: general }) : t('impuestosPais.depende', { impuesto: nombre })}</Texto>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, minHeight: ALTO_TOCABLE }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="fuerte">{t('impuestosPais.cobras', { impuesto: nombre })}</Texto>
          <Texto variante="pequeno">{t('impuestosPais.cobrasAyuda', { impuesto: nombre })}</Texto>
        </View>
        <Interruptor etiqueta={t('impuestosPais.cobras', { impuesto: nombre })} encendido={!!conf.responsable_iva} onCambio={(v) => guardar({ responsable_iva: v })} />
      </View>
      {conf.responsable_iva && (
        <CampoTexto
          etiqueta={t('impuestosPais.tasaVentas', { impuesto: nombre })}
          ayuda={general !== null ? t('impuestosPais.tasaVentasAyuda', { tasa: general }) : undefined}
          keyboardType="decimal-pad"
          placeholder={general !== null ? String(general) : '8'}
          value={ventas}
          onChangeText={(v) => setVentas(v.replace(/[^\d.,]/g, '').slice(0, 5))}
          onEndEditing={() => guardar({ tasa_ventas: leerPorcentaje(ventas) })}
        />
      )}
      <CampoTexto
        etiqueta={t('impuestosPais.tasaUtilidad')}
        ayuda={t('impuestosPais.tasaUtilidadAyuda')}
        keyboardType="decimal-pad"
        placeholder="25"
        value={utilidad}
        onChangeText={(v) => setUtilidad(v.replace(/[^\d.,]/g, '').slice(0, 5))}
        onEndEditing={() => guardar({ tasa_utilidad: leerPorcentaje(utilidad) })}
      />
      <Texto variante="pequeno">{t('impuestosPais.nota')}</Texto>
    </Tarjeta>
  );
}
