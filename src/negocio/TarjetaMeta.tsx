import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Barra } from '@/components/Barra';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { Emoji } from '@/components/emoji/Emoji';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { hoyEn } from '@/lib/fechas';
import { avanceMeta } from '@/lib/metasNegocio';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { ESPACIO, useTema } from '@/theme';

import { useNegocio } from './contexto';
import { guardarConfiguracion } from './datos';

/** B15 · Meta de ventas del mes en el Resumen: avance, lo que falta por día y si al ritmo actual se logra. */
export function TarjetaMeta({ vendido }: { vendido: number }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const ejemplo = useModoEjemplo();
  const { negocio, actualizar } = useNegocio();
  const meta = negocio?.configuracion.meta_ventas_mes ?? 0;
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(meta);
  if (!negocio || negocio.rol !== 'owner') return null;
  const hoy = hoyEn();
  const mes = textosFecha.mesesLargos[Number(hoy.slice(5, 7)) - 1];

  async function guardar() {
    if (ejemplo) return avisarEjemplo();
    if (!negocio) return;
    await guardarConfiguracion(negocio, { meta_ventas_mes: valor > 0 ? valor : undefined });
    setEditando(false);
    actualizar();
  }

  if (editando || !meta) {
    if (!editando)
      return (
        <Pressable accessibilityRole="button" onPress={() => setEditando(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, padding: ESPACIO.m, borderRadius: 16, backgroundColor: colores.seleccionado }}>
          <Emoji name="diana" size={28} />
          <View style={{ flex: 1 }}>
            <Texto variante="fuerte">{t('metaNegocio.ponte')}</Texto>
            <Texto variante="pequeno">{t('metaNegocio.ponteDetalle')}</Texto>
          </View>
        </Pressable>
      );
    return (
      <Tarjeta style={{ gap: ESPACIO.s }}>
        <Texto variante="subtitulo">{t('metaNegocio.titulo', { mes })}</Texto>
        <CampoDinero etiqueta={t('metaNegocio.cuanto')} valor={valor} onCambio={setValor} />
        <Boton titulo={t('metaNegocio.guardar')} onPress={guardar} />
        <Boton titulo={t('movimiento.cancelar')} variante="texto" onPress={() => setEditando(false)} />
      </Tarjeta>
    );
  }

  const a = avanceMeta({ meta, vendido, hoy });
  const color = a.estado === 'atrasado' ? colores.avisoTexto : colores.ingresoTexto;
  return (
    <Pressable accessibilityRole="button" accessibilityHint={t('metaNegocio.cambiar')} onPress={() => setEditando(true)}>
      <Tarjeta style={{ gap: ESPACIO.s }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
          <Emoji name="diana" size={28} />
          <View style={{ flex: 1 }}>
            <Texto variante="etiqueta">{t('metaNegocio.titulo', { mes })}</Texto>
            <Texto variante="fuerte">{t('metaNegocio.llevas', { vendido: plata(vendido), meta: plata(meta), porcentaje: a.porcentaje })}</Texto>
          </View>
        </View>
        <Barra valor={Math.min(1, meta > 0 ? vendido / meta : 0)} color={color} alto={10} />
        <Texto variante="pequeno" color={color}>
          {a.estado === 'lograda'
            ? t('metaNegocio.lograda')
            : a.estado === 'vasBien'
              ? t('metaNegocio.vasBien', { proyeccion: plata(a.proyeccion), porDia: plata(a.porDia) })
              : t('metaNegocio.atrasado', { porDia: plata(a.porDia), proyeccion: plata(a.proyeccion) })}
        </Texto>
      </Tarjeta>
    </Pressable>
  );
}
