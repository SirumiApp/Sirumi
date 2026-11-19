// Qué recordatorios programar en el celular (notificaciones locales). Funciones puras.

import { estadoRecurrente, type Recurrente } from './contactos';
import { armarFecha, diasDelMes, partes, sumarDias, type Fecha } from './fechas';
import type { Vencimiento } from './calendarioTributario';
import type { MovNegocio } from './negocio';

export type Recordatorio = { clave: string; fecha: Fecha; recurrente: Recurrente };

/**
 * B10 · Un recordatorio el día que vence cada pago recurrente activo, en los próximos `dias` días.
 * El de este mes no se programa si ya está pagado. Si el mes es más corto, vence el último día.
 */
export function recordatoriosDeRecurrentes(lista: Recurrente[], movs: MovNegocio[], hoy: Fecha, dias = 35): Recordatorio[] {
  const limite = sumarDias(hoy, dias);
  const { anio, mes } = partes(hoy);
  const meses = [0, 1, 2].map((d) => {
    const total = anio * 12 + (mes - 1) + d;
    return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
  });
  const salida: Recordatorio[] = [];
  for (const r of lista.filter((x) => x.activo)) {
    const pagadoEsteMes = estadoRecurrente(r, movs, hoy).estado === 'pagado';
    for (const [i, m] of meses.entries()) {
      const fecha = armarFecha(m.anio, m.mes, Math.min(r.dia, diasDelMes(m.anio, m.mes)));
      if (fecha < hoy || fecha > limite) continue;
      if (i === 0 && pagadoEsteMes) continue;
      salida.push({ clave: `recurrente-${r.id}-${fecha}`, fecha, recurrente: r });
    }
  }
  return salida.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** B12 · Avisos de impuestos: 3 días antes y el mismo día; si solo sabemos el mes, el primer día de ese mes. */
export function recordatoriosDeImpuestos(lista: Vencimiento[], hoy: Fecha): { clave: string; fecha: Fecha; vencimiento: Vencimiento; cuando: 'antes' | 'hoy' | 'mes' }[] {
  const salida: { clave: string; fecha: Fecha; vencimiento: Vencimiento; cuando: 'antes' | 'hoy' | 'mes' }[] = [];
  for (const v of lista) {
    const base = `impuesto-${v.obligacion}-${v.mes}`;
    if (v.fecha) {
      const antes = sumarDias(v.fecha, -3);
      if (antes >= hoy) salida.push({ clave: `${base}-antes`, fecha: antes, vencimiento: v, cuando: 'antes' });
      if (v.fecha >= hoy) salida.push({ clave: `${base}-hoy`, fecha: v.fecha, vencimiento: v, cuando: 'hoy' });
    } else {
      const primero = `${v.mes}-01`;
      if (primero >= hoy) salida.push({ clave: `${base}-mes`, fecha: primero, vencimiento: v, cuando: 'mes' });
    }
  }
  return salida.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** B9 · "Sube tus extractos de {mes}": el día 5 de cada mes, por el mes que acaba de cerrar. */
export function recordatoriosDeExtractos(hoy: Fecha, meses = 2): { clave: string; fecha: Fecha; mes: string }[] {
  const { anio, mes } = partes(hoy);
  const salida: { clave: string; fecha: Fecha; mes: string }[] = [];
  for (let d = 0; d <= meses; d++) {
    const total = anio * 12 + (mes - 1) + d;
    const fecha = armarFecha(Math.floor(total / 12), (total % 12) + 1, 5);
    const anterior = total - 1;
    const etiqueta = `${Math.floor(anterior / 12)}-${String((anterior % 12) + 1).padStart(2, '0')}`;
    if (fecha >= hoy) salida.push({ clave: `extracto-${etiqueta}`, fecha, mes: etiqueta });
  }
  return salida.slice(0, meses);
}
