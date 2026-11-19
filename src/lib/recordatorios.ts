// Qué recordatorios programar en el celular (notificaciones locales). Funciones puras.

import { estadoRecurrente, type Recurrente } from './contactos';
import { armarFecha, diasDelMes, partes, sumarDias, type Fecha } from './fechas';
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
