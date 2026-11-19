import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Interruptor } from '@/components/Interruptor';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { hoyEn } from '@/lib/fechas';
import { normalizarCodigo, validarCodigoDescuento } from '@/lib/ventas';
import { useNegocio } from '@/negocio/contexto';
import { fechaCorta } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { borrarCodigoDescuento, guardarCodigoDescuento } from '@/pos/datos';
import { ESPACIO, FUENTES, useTema } from '@/theme';

/** Códigos de descuento del negocio (D7): NAVIDAD10 = 10%, FERIA5000 = $ 5.000. */
export default function Codigos() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const { negocio, codigos, ventas, actualizar } = useNegocio();
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState<'porcentaje' | 'monto'>('porcentaje');
  const [porcentaje, setPorcentaje] = useState('10');
  const [monto, setMonto] = useState(0);
  const [vence, setVence] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hoy = hoyEn();

  async function crear() {
    if (!negocio) return;
    const valor = tipo === 'porcentaje' ? parseInt(porcentaje || '0', 10) : monto;
    const v = validarCodigoDescuento({ codigo, tipo, valor }, codigos);
    if (v) return setError(t(`errores.${v}`));
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(vence) ? vence : null;
    const { error: e } = await guardarCodigoDescuento(negocio.id, { codigo, tipo, valor, activo: true, vence: fecha });
    if (e) return setError(t('vendedores.error'));
    setError(null);
    setCodigo('');
    setVence('');
    actualizar();
  }

  return (
    <PantallaAjuste titulo={t('codigos.titulo')} detalle={t('codigos.detalle')}>
      {codigos.map((c) => {
        const usos = ventas.filter((v) => v.codigo === c.codigo && v.estado !== 'devuelta').length;
        const vencido = !!c.vence && c.vence < hoy;
        return (
          <Tarjeta key={c.id} style={{ gap: ESPACIO.xs, padding: ESPACIO.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
              <View style={{ flex: 1 }}>
                <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 18, lineHeight: 24, letterSpacing: 1 }}>{c.codigo}</Texto>
                <Texto variante="pequeno">
                  {[
                    c.tipo === 'porcentaje' ? t('codigos.porcentaje', { valor: c.valor }) : t('codigos.monto', { valor: plata(c.valor) }),
                    c.vence ? (vencido ? t('codigos.vencio') : t('codigos.vence', { fecha: fechaCorta(c.vence, textosFecha, true) })) : t('codigos.sinVencimiento'),
                    t('codigos.usos', { count: usos }),
                  ].join(' · ')}
                </Texto>
              </View>
              <Interruptor
                etiqueta={c.codigo}
                encendido={c.activo && !vencido}
                onCambio={async (v) => {
                  if (!negocio) return;
                  await guardarCodigoDescuento(negocio.id, { ...c, activo: v }, c.id);
                  actualizar();
                }}
              />
            </View>
            <Boton
              titulo={t('codigos.borrar')}
              variante="texto"
              onPress={() =>
                Alert.alert(t('codigos.borrar'), c.codigo, [
                  { text: t('movimiento.cancelar'), style: 'cancel' },
                  {
                    text: t('codigos.borrar'),
                    style: 'destructive',
                    onPress: async () => {
                      await borrarCodigoDescuento(c.id);
                      actualizar();
                    },
                  },
                ])
              }
            />
          </Tarjeta>
        );
      })}
      {codigos.length === 0 && <Texto variante="suave">{t('codigos.vacio')}</Texto>}

      <Texto variante="subtitulo">{t('codigos.nuevo')}</Texto>
      <CampoTexto
        etiqueta={t('codigos.codigo')}
        placeholder="NAVIDAD10"
        value={codigo}
        onChangeText={(v) => setCodigo(normalizarCodigo(v).slice(0, 20))}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <View style={{ flexDirection: 'row', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        <Chip texto={t('codigos.tipoPorcentaje')} elegido={tipo === 'porcentaje'} onPress={() => setTipo('porcentaje')} />
        <Chip texto={t('codigos.tipoMonto')} elegido={tipo === 'monto'} onPress={() => setTipo('monto')} />
      </View>
      {tipo === 'porcentaje' ? (
        <CampoTexto etiqueta={t('codigos.cuantoPorcentaje')} keyboardType="number-pad" value={porcentaje} onChangeText={(v) => setPorcentaje(v.replace(/\D/g, '').slice(0, 3))} />
      ) : (
        <CampoDinero etiqueta={t('codigos.cuantoMonto')} valor={monto} onCambio={setMonto} />
      )}
      <CampoTexto etiqueta={t('codigos.venceEl')} ayuda={t('codigos.venceAyuda')} placeholder="2026-12-31" value={vence} onChangeText={(v) => setVence(v.replace(/[^\d-]/g, '').slice(0, 10))} keyboardType="numbers-and-punctuation" />
      {error && <Aviso mensaje={error} />}
      <Boton titulo={t('codigos.crear')} onPress={crear} />
      <Texto variante="pequeno" color={colores.textoSuave}>
        {t('codigos.nota')}
      </Texto>
    </PantallaAjuste>
  );
}
