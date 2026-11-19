import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Texto } from '@/components/Texto';
import { numeroVenta } from '@/lib/pos';
import { FilaCifra, ListaFilas } from '@/negocio/Piezas';
import { usePlata } from '@/personal/ganchos';
import { ESPACIO, useTema } from '@/theme';

import type { Comprobante } from './contexto';

/** Comprobante de una venta: número, líneas, descuento, total, cliente y forma de pago (spec 05, §3). */
export function VistaComprobante({ c }: { c: Comprobante }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  return (
    <View style={{ gap: ESPACIO.s }}>
      <Texto variante="etiqueta">
        {t('pos.comprobante')} · {numeroVenta(c.numero)}
      </Texto>
      <ListaFilas>
        {[
          ...c.lineas.map((l, i) => <FilaCifra key={i} titulo={`${l.cantidad} × ${l.nombre}`} ayuda={l.cantidad > 1 ? plata(l.precio) : undefined} valor={plata(l.precio * l.cantidad)} />),
          c.descuento > 0 ? <FilaCifra key="d" titulo={t('pos.descuento')} valor={`−${plata(c.descuento)}`} color={colores.ingresoTexto} /> : null,
          c.iva > 0 && c.tarifaIva ? (
            <FilaCifra key="i" titulo={c.ivaIncluido ? t('pos.iva.lineaIncluido', { tarifa: c.tarifaIva }) : t('pos.iva.linea', { tarifa: c.tarifaIva })} valor={plata(c.iva)} />
          ) : null,
          <FilaCifra key="t" titulo={t('pos.total')} valor={plata(c.total)} fuerte />,
          <FilaCifra key="p" titulo={t('pos.recibo.pago')} valor={c.pagos.map((p) => (c.pagos.length > 1 ? `${p.nombre} ${plata(p.monto)}` : p.nombre)).join(' + ')} />,
          c.vuelto ? <FilaCifra key="v" titulo={t('pos.recibo.vuelto')} valor={plata(c.vuelto)} /> : null,
          <FilaCifra key="c" titulo={t('pos.cliente')} valor={c.cliente ?? t('pos.consumidorFinal')} />,
        ]}
      </ListaFilas>
    </View>
  );
}
