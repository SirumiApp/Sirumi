import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Barra } from '@/components/Barra';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaApp } from '@/components/PantallaApp';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { cajaTotal, estadoTarjeta, saldoCuenta } from '@/lib/negocio';
import { useNegocio } from '@/negocio/contexto';
import { usePlata } from '@/personal/ganchos';
import { ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

/** Negocio · Caja (docs/specs/03-negocio.md, §4): saldo de cada cuenta (B2), total (B4) y tarjetas (B3). */
export default function Caja() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const { cuentas, tarjetas, movimientos, traslados } = useNegocio();
  const base = cuentas.map((c) => ({ id: c.id, saldoInicial: c.saldoInicial }));
  const total = cajaTotal(base, movimientos, traslados);

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

      <Texto variante="pequeno" style={{ textAlign: 'center' }}>
        {t('negocioApp.caja.pronto')}
      </Texto>
    </PantallaApp>
  );
}
