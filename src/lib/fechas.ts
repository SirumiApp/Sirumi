// Fechas como texto AAAA-MM-DD (sin horas) y períodos. "Hoy" es el de Colombia (America/Bogota, UTC−5 todo el año).

export type Fecha = string;
export type Periodo = { desde: Fecha; hasta: Fecha };
export type PeriodoPredefinido = 'mes' | 'mesPasado' | 'tresMeses' | 'anio';

const MS_DIA = 86_400_000;
const DESFASE_BOGOTA_MS = 5 * 3_600_000;

const dosDigitos = (n: number) => String(n).padStart(2, '0');

export function partes(fecha: Fecha): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return { anio, mes, dia };
}

export function armarFecha(anio: number, mes: number, dia: number): Fecha {
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

function aUTC(fecha: Fecha): number {
  const { anio, mes, dia } = partes(fecha);
  return Date.UTC(anio, mes - 1, dia);
}

function desdeUTC(ms: number): Fecha {
  return new Date(ms).toISOString().slice(0, 10);
}

/** La fecha de hoy en Colombia. */
export function hoyEn(ahora: Date = new Date()): Fecha {
  return desdeUTC(ahora.getTime() - DESFASE_BOGOTA_MS);
}

export function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

export function sumarDias(fecha: Fecha, dias: number): Fecha {
  return desdeUTC(aUTC(fecha) + dias * MS_DIA);
}

/** Días de diferencia (hasta − desde). */
export function diasEntre(desde: Fecha, hasta: Fecha): number {
  return Math.round((aUTC(hasta) - aUTC(desde)) / MS_DIA);
}

/** Días que cubre el período, contando los dos extremos. */
export function diasDelPeriodo(p: Periodo): number {
  return Math.max(1, diasEntre(p.desde, p.hasta) + 1);
}

/** Mes anterior a (anio, mes). */
function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function periodoPredefinido(cual: PeriodoPredefinido, hoy: Fecha): Periodo {
  const { anio, mes } = partes(hoy);
  switch (cual) {
    case 'mes':
      return { desde: armarFecha(anio, mes, 1), hasta: hoy };
    case 'mesPasado': {
      const a = mesAnterior(anio, mes);
      return { desde: armarFecha(a.anio, a.mes, 1), hasta: armarFecha(a.anio, a.mes, diasDelMes(a.anio, a.mes)) };
    }
    case 'tresMeses': {
      const a = mesAnterior(anio, mes);
      const b = mesAnterior(a.anio, a.mes);
      return { desde: armarFecha(b.anio, b.mes, 1), hasta: hoy };
    }
    case 'anio':
      return { desde: armarFecha(anio, 1, 1), hasta: hoy };
  }
}

/** Un mes completo, o el mes actual desde el día 1 hasta hoy. */
export function esMesCompletoOActual(p: Periodo, hoy: Fecha): boolean {
  const d = partes(p.desde);
  const h = partes(p.hasta);
  if (d.anio !== h.anio || d.mes !== h.mes || d.dia !== 1) return false;
  return h.dia === diasDelMes(h.anio, h.mes) || p.hasta === hoy;
}

/** A2 · Si es un mes: el mes calendario anterior completo. Si es un rango de N días: los N días justo antes. */
export function periodoAnterior(p: Periodo, hoy: Fecha): Periodo {
  if (esMesCompletoOActual(p, hoy)) {
    const d = partes(p.desde);
    const a = mesAnterior(d.anio, d.mes);
    return { desde: armarFecha(a.anio, a.mes, 1), hasta: armarFecha(a.anio, a.mes, diasDelMes(a.anio, a.mes)) };
  }
  const hasta = sumarDias(p.desde, -1);
  return { desde: sumarDias(hasta, -(diasDelPeriodo(p) - 1)), hasta };
}

export function dentroDe(fecha: Fecha, p: Periodo): boolean {
  return fecha >= p.desde && fecha <= p.hasta;
}
