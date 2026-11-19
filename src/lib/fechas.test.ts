// Fechas en formato AAAA-MM-DD y períodos (docs/reglas-de-calculo.md, convenciones y A2).
import { describe, expect, it } from '@jest/globals';

import {
  mismoPeriodoAnioPasado,
  diasDelMes,
  diasEntre,
  esMesCompletoOActual,
  hoyEn,
  periodoAnterior,
  periodoPredefinido,
  sumarDias,
} from './fechas';

describe('utilidades de fechas', () => {
  it('días del mes, incluido febrero bisiesto', () => {
    expect(diasDelMes(2026, 11)).toBe(30);
    expect(diasDelMes(2028, 2)).toBe(29);
    expect(diasDelMes(2026, 2)).toBe(28);
  });
  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-11-01', -1)).toBe('2026-10-31');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('días entre dos fechas', () => {
    expect(diasEntre('2026-11-01', '2026-11-15')).toBe(14);
  });
  it('"hoy" se calcula en la hora de Colombia', () => {
    // 18 nov 2026 a las 2:00 a. m. UTC todavía es 17 nov en Bogotá (UTC−5).
    expect(hoyEn(new Date('2026-11-18T02:00:00Z'))).toBe('2026-11-17');
    expect(hoyEn(new Date('2026-11-18T06:00:00Z'))).toBe('2026-11-18');
  });
});

describe('períodos predefinidos (hoy = 15 nov 2026)', () => {
  const hoy = '2026-11-15';
  it('Este mes: del 1 a hoy', () => expect(periodoPredefinido('mes', hoy)).toEqual({ desde: '2026-11-01', hasta: hoy }));
  it('Mes pasado: el mes anterior completo', () =>
    expect(periodoPredefinido('mesPasado', hoy)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' }));
  it('Últimos 3 meses: desde el 1 de hace dos meses', () =>
    expect(periodoPredefinido('tresMeses', hoy)).toEqual({ desde: '2026-09-01', hasta: hoy }));
  it('Este año: desde el 1 de enero', () => expect(periodoPredefinido('anio', hoy)).toEqual({ desde: '2026-01-01', hasta: hoy }));
  it('Mes pasado en enero es diciembre del año anterior', () =>
    expect(periodoPredefinido('mesPasado', '2027-01-10')).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' }));
});

describe('A2 · período anterior', () => {
  const hoy = '2026-11-15';
  it('un mes completo o el mes actual hasta hoy cuenta como mes', () => {
    expect(esMesCompletoOActual({ desde: '2026-11-01', hasta: hoy }, hoy)).toBe(true);
    expect(esMesCompletoOActual({ desde: '2026-10-01', hasta: '2026-10-31' }, hoy)).toBe(true);
    expect(esMesCompletoOActual({ desde: '2026-10-01', hasta: '2026-10-20' }, hoy)).toBe(false);
  });
  it('si es un mes, el anterior es el mes calendario anterior completo', () => {
    expect(periodoAnterior({ desde: '2026-11-01', hasta: hoy }, hoy)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(periodoAnterior({ desde: '2026-03-01', hasta: '2026-03-31' }, hoy)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
  });
  it('si es un rango libre de N días, es el rango de N días justo antes', () => {
    // 10 días: del 5 al 14 de noviembre → del 26 oct al 4 nov.
    expect(periodoAnterior({ desde: '2026-11-05', hasta: '2026-11-14' }, hoy)).toEqual({ desde: '2026-10-26', hasta: '2026-11-04' });
  });
});

describe('mismo período del año pasado', () => {
  it('corre un año y ajusta el 29 de febrero', () => {
    expect(mismoPeriodoAnioPasado({ desde: '2026-11-01', hasta: '2026-11-30' })).toEqual({ desde: '2025-11-01', hasta: '2025-11-30' });
    expect(mismoPeriodoAnioPasado({ desde: '2028-02-01', hasta: '2028-02-29' })).toEqual({ desde: '2027-02-01', hasta: '2027-02-28' });
  });
});
