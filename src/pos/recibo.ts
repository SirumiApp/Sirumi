// Texto del comprobante para compartir por WhatsApp o correo (spec 05, §3). Recibo de regalo: sin precios.

import type { TFunction } from 'i18next';

import { numeroVenta } from '@/lib/pos';

import type { Comprobante } from './contexto';

export function textoRecibo(c: Comprobante, negocio: string, t: TFunction, plata: (v: number) => string, regalo = false): string {
  const numeroTexto = c.pendiente ? '' : numeroVenta(c.numero);
  const filas = [regalo ? t('pos.recibo.regalo', { negocio, numero: numeroTexto }) : t('pos.recibo.titulo', { negocio, numero: numeroTexto }), ''];
  for (const l of c.lineas) filas.push(regalo ? `${l.cantidad} × ${l.nombre}` : `${l.cantidad} × ${l.nombre} · ${plata(l.precio * l.cantidad)}`);
  if (!regalo) {
    filas.push('');
    if (c.descuento > 0) filas.push(`${t('pos.recibo.descuento')}: −${plata(c.descuento)}`);
    if (c.iva > 0 && c.tarifaIva) filas.push(`${c.ivaIncluido ? t('pos.iva.lineaIncluido', { tarifa: c.tarifaIva }) : t('pos.iva.linea', { tarifa: c.tarifaIva })}: ${plata(c.iva)}`);
    filas.push(`${t('pos.recibo.total')}: ${plata(c.total)}`);
    filas.push(`${t('pos.recibo.pago')}: ${c.pagos.map((p) => (c.pagos.length > 1 ? `${p.nombre} ${plata(p.monto)}` : p.nombre)).join(' + ')}`);
    if (c.vuelto) filas.push(`${t('pos.recibo.vuelto')}: ${plata(c.vuelto)}`);
  }
  if (c.cliente) filas.push('', t('pos.recibo.cliente', { nombre: c.cliente }));
  filas.push('', t('pos.recibo.gracias'));
  return filas.join('\n');
}
