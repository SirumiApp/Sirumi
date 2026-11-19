// B12 · Calendario de impuestos del negocio (DIAN). Funciones puras.
// Base: Decreto 2229 de 2023 (DUR 1625 de 2016): los pagos mensuales y bimestrales vencen entre el día hábil 7
// y el 16 del mes, según el último dígito del NIT (1 → 7.º … 9 → 15.º, 0 → 16.º). Hábil = lunes a viernes sin festivos.
// Los festivos salen de la Ley 51 de 1983 (Emiliani) y la Pascua. Si la DIAN mueve una fecha (día cívico, festivo nuevo),
// el ajuste llega desde el servidor (tax_parameters.params.calendario) sin publicar otra versión de la app.
// VALIDAR CON EL CONTADOR ANTES DE LANZAR.

import { armarFecha, diasDelMes, partes, sumarDias, type Fecha } from './fechas';

export type Obligacion = 'retencion' | 'ivaBimestral' | 'ivaCuatrimestral' | 'anticipoSimple' | 'ivaAnualSimple' | 'declaracionSimple' | 'rentaSociedad' | 'rentaPersona';

export type PerfilTributario = {
  regimen: 'simple' | 'ordinario' | 'natural' | null;
  /** Último dígito del NIT, sin el dígito de verificación. */
  digito: number | null;
  responsableIva: boolean;
  agenteRetencion: boolean;
  periodoIva: 'bimestral' | 'cuatrimestral';
};

/** Ajustes que manda el servidor: días que no son hábiles aparte de los festivos, y fechas que la DIAN movió. */
export type AjustesCalendario = {
  diasNoHabiles?: Fecha[];
  /** Clave "obligacion|AAAA-MM|digito" → fecha nueva. */
  fechas?: Record<string, Fecha>;
};

export type Vencimiento = {
  obligacion: Obligacion;
  /** Mes en que vence (AAAA-MM). */
  mes: string;
  /** Fecha exacta, o null cuando solo sabemos el mes (declaraciones anuales: revisa con tu contador). */
  fecha: Fecha | null;
  /** Periodo que se declara: desde y hasta (AAAA-MM). */
  periodo: { desde: string; hasta: string };
};

const mesTexto = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, '0')}`;
function moverMes(anio: number, mes: number, delta: number) {
  const total = anio * 12 + (mes - 1) + delta;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
export function pascua(anio: number): Fecha {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return armarFecha(anio, mes, dia);
}

const diaSemana = (f: Fecha) => {
  const { anio, mes, dia } = partes(f);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0 = domingo
};
/** Ley Emiliani: si no cae lunes, pasa al lunes siguiente. */
const alLunes = (f: Fecha) => {
  const d = diaSemana(f);
  return d === 1 ? f : sumarDias(f, (8 - d) % 7);
};

/** Festivos de Colombia del año (18). */
export function festivosColombia(anio: number): Fecha[] {
  const f = (mes: number, dia: number) => armarFecha(anio, mes, dia);
  const p = pascua(anio);
  return [
    f(1, 1),
    alLunes(f(1, 6)),
    alLunes(f(3, 19)),
    sumarDias(p, -3), // Jueves Santo
    sumarDias(p, -2), // Viernes Santo
    f(5, 1),
    alLunes(sumarDias(p, 39)), // Ascensión
    alLunes(sumarDias(p, 60)), // Corpus Christi
    alLunes(sumarDias(p, 68)), // Sagrado Corazón
    alLunes(f(6, 29)),
    f(7, 20),
    f(8, 7),
    alLunes(f(8, 15)),
    alLunes(f(10, 12)),
    alLunes(f(11, 1)),
    alLunes(f(11, 11)),
    f(12, 8),
    f(12, 25),
  ].sort();
}

/** El día hábil número `n` del mes. */
export function diaHabil(anio: number, mes: number, n: number, ajustes?: AjustesCalendario): Fecha {
  const noHabiles = new Set([...festivosColombia(anio), ...(ajustes?.diasNoHabiles ?? [])]);
  let cuenta = 0;
  for (let dia = 1; dia <= diasDelMes(anio, mes); dia++) {
    const fecha = armarFecha(anio, mes, dia);
    const ds = diaSemana(fecha);
    if (ds === 0 || ds === 6 || noHabiles.has(fecha)) continue;
    if (++cuenta === n) return fecha;
  }
  return armarFecha(anio, mes, diasDelMes(anio, mes));
}

/** Vencimiento por último dígito del NIT: 1 → 7.º día hábil … 9 → 15.º, 0 → 16.º. */
export function fechaPorDigito(anio: number, mes: number, digito: number, ajustes?: AjustesCalendario): Fecha {
  return diaHabil(anio, mes, 7 + ((digito + 9) % 10), ajustes);
}

/** Meses del año en que vence cada obligación y cuántos meses atrás cubre (periodo). */
const REGLAS: Record<Obligacion, { meses: number[]; cubre: number; exacta: boolean }> = {
  retencion: { meses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], cubre: 1, exacta: true },
  ivaBimestral: { meses: [1, 3, 5, 7, 9, 11], cubre: 2, exacta: true },
  ivaCuatrimestral: { meses: [1, 5, 9], cubre: 4, exacta: true },
  // SIMPLE: ene-feb se paga en mayo (después de la declaración anual de abril); luego cada bimestre al mes siguiente.
  anticipoSimple: { meses: [1, 5, 6, 7, 9, 11], cubre: 2, exacta: true },
  ivaAnualSimple: { meses: [2], cubre: 12, exacta: false },
  declaracionSimple: { meses: [4], cubre: 12, exacta: false },
  rentaSociedad: { meses: [5], cubre: 12, exacta: false },
  rentaPersona: { meses: [8], cubre: 12, exacta: false },
};

/** Periodo del anticipo SIMPLE según el mes de pago (mayo paga ene-feb, junio mar-abr, julio may-jun…). */
function periodoAnticipo(anio: number, mes: number) {
  const fin = mes === 5 ? { anio, mes: 2 } : mes === 6 ? { anio, mes: 4 } : moverMes(anio, mes, -1);
  const inicio = moverMes(fin.anio, fin.mes, -1);
  return { desde: mesTexto(inicio.anio, inicio.mes), hasta: mesTexto(fin.anio, fin.mes) };
}

/** Qué obligaciones tiene el negocio según su régimen y responsabilidades. */
export function obligacionesDe(p: PerfilTributario): Obligacion[] {
  const o: Obligacion[] = [];
  if (p.agenteRetencion) o.push('retencion');
  if (p.regimen === 'simple') {
    o.push('anticipoSimple', 'declaracionSimple');
    if (p.responsableIva) o.push('ivaAnualSimple');
  } else {
    if (p.responsableIva) o.push(p.periodoIva === 'cuatrimestral' ? 'ivaCuatrimestral' : 'ivaBimestral');
    if (p.regimen === 'ordinario') o.push('rentaSociedad');
    if (p.regimen === 'natural') o.push('rentaPersona');
  }
  return o;
}

/**
 * B12 · Vencimientos entre `desde` y `hasta` (incluidas), ordenados por fecha.
 * Sin dígito del NIT no hay fecha exacta: se muestra el mes.
 */
export function vencimientos(p: PerfilTributario, desde: Fecha, hasta: Fecha, ajustes?: AjustesCalendario): Vencimiento[] {
  const salida: Vencimiento[] = [];
  const ini = partes(desde);
  const fin = partes(hasta);
  for (let m = { anio: ini.anio, mes: ini.mes }; m.anio * 12 + m.mes <= fin.anio * 12 + fin.mes; m = moverMes(m.anio, m.mes, 1)) {
    const mes = mesTexto(m.anio, m.mes);
    for (const obligacion of obligacionesDe(p)) {
      const regla = REGLAS[obligacion];
      if (!regla.meses.includes(m.mes)) continue;
      let periodo: Vencimiento['periodo'];
      if (obligacion === 'anticipoSimple') periodo = periodoAnticipo(m.anio, m.mes);
      else if (regla.cubre === 12) periodo = { desde: mesTexto(m.anio - 1, 1), hasta: mesTexto(m.anio - 1, 12) };
      else {
        const a = moverMes(m.anio, m.mes, -regla.cubre);
        const b = moverMes(m.anio, m.mes, -1);
        periodo = { desde: mesTexto(a.anio, a.mes), hasta: mesTexto(b.anio, b.mes) };
      }
      let fecha: Fecha | null = null;
      if (regla.exacta && p.digito !== null) {
        fecha = ajustes?.fechas?.[`${obligacion}|${mes}|${p.digito}`] ?? fechaPorDigito(m.anio, m.mes, p.digito, ajustes);
      }
      // Con fecha exacta se filtra por fecha; sin ella, por mes.
      if (fecha ? fecha < desde || fecha > hasta : false) continue;
      salida.push({ obligacion, mes, fecha, periodo });
    }
  }
  return salida.sort((a, b) => (a.fecha ?? `${a.mes}-32`).localeCompare(b.fecha ?? `${b.mes}-32`));
}
