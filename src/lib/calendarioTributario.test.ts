import { describe, expect, it } from '@jest/globals';

import { diaHabil, fechaPorDigito, festivosColombia, obligacionesDe, pascua, vencimientos, type PerfilTributario } from './calendarioTributario';

const simple: PerfilTributario = { regimen: 'simple', digito: 1, responsableIva: false, agenteRetencion: false, periodoIva: 'bimestral' };

describe('B12 · calendario de impuestos', () => {
  it('Pascua y festivos de Colombia', () => {
    expect(pascua(2026)).toBe('2026-04-05');
    expect(pascua(2027)).toBe('2027-03-28');
    const f = festivosColombia(2026);
    expect(f).toHaveLength(18);
    // Todos los Santos 2026 (domingo 1) pasa al lunes 2; Independencia de Cartagena es el lunes 16.
    expect(f).toEqual(expect.arrayContaining(['2026-11-02', '2026-11-16', '2026-12-08', '2026-10-12', '2026-01-12']));
  });

  it('cuenta días hábiles saltando fines de semana y festivos', () => {
    expect(diaHabil(2026, 11, 1)).toBe('2026-11-03');
    expect(diaHabil(2026, 11, 7)).toBe('2026-11-11');
  });

  it('coincide con las fechas publicadas por la DIAN (dígito 1 → hábil 7, dígito 0 → hábil 16)', () => {
    // Noviembre 2026: 11, 12, 13, 17, 18, 19, 20, 23, 24 y 25.
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => fechaPorDigito(2026, 11, d).slice(8))).toEqual(['11', '12', '13', '17', '18', '19', '20', '23', '24', '25']);
    // Octubre 2026: del 9 al 23. Diciembre 2025: del 10 al 23.
    expect(fechaPorDigito(2026, 10, 1)).toBe('2026-10-09');
    expect(fechaPorDigito(2026, 10, 0)).toBe('2026-10-23');
    expect(fechaPorDigito(2025, 12, 1)).toBe('2025-12-10');
    expect(fechaPorDigito(2025, 12, 9)).toBe('2025-12-22');
  });

  it('el servidor puede mover un día o una fecha', () => {
    expect(fechaPorDigito(2026, 11, 1, { diasNoHabiles: ['2026-11-11'] })).toBe('2026-11-12');
    const v = vencimientos(simple, '2026-11-01', '2026-11-30', { fechas: { 'anticipoSimple|2026-11|1': '2026-11-20' } });
    expect(v[0].fecha).toBe('2026-11-20');
  });

  it('qué obligaciones tiene cada negocio', () => {
    expect(obligacionesDe(simple)).toEqual(['anticipoSimple', 'declaracionSimple']);
    expect(obligacionesDe({ ...simple, responsableIva: true, agenteRetencion: true })).toEqual(['retencion', 'anticipoSimple', 'declaracionSimple', 'ivaAnualSimple']);
    expect(obligacionesDe({ ...simple, regimen: 'ordinario', responsableIva: true })).toEqual(['ivaBimestral', 'rentaSociedad']);
    expect(obligacionesDe({ ...simple, regimen: 'natural', responsableIva: true, periodoIva: 'cuatrimestral' })).toEqual(['ivaCuatrimestral', 'rentaPersona']);
  });

  it('SIMPLE: anticipo de sep-oct en noviembre, de nov-dic en enero y declaración anual en abril', () => {
    const v = vencimientos(simple, '2026-11-01', '2027-06-30');
    expect(v.map((x) => [x.obligacion, x.mes, x.fecha, x.periodo.desde, x.periodo.hasta])).toEqual([
      ['anticipoSimple', '2026-11', '2026-11-11', '2026-09', '2026-10'],
      ['anticipoSimple', '2027-01', expect.any(String), '2026-11', '2026-12'],
      ['declaracionSimple', '2027-04', null, '2026-01', '2026-12'],
      ['anticipoSimple', '2027-05', expect.any(String), '2027-01', '2027-02'],
      ['anticipoSimple', '2027-06', expect.any(String), '2027-03', '2027-04'],
    ]);
  });

  it('retención mensual e IVA bimestral del mes anterior; sin dígito, sin fecha exacta', () => {
    const v = vencimientos({ regimen: 'ordinario', digito: null, responsableIva: true, agenteRetencion: true, periodoIva: 'bimestral' }, '2026-11-01', '2026-11-30');
    expect(v.map((x) => [x.obligacion, x.fecha, x.periodo.desde])).toEqual([
      ['retencion', null, '2026-10'],
      ['ivaBimestral', null, '2026-09'],
    ]);
  });

  it('una fecha que ya pasó en el rango no sale', () => {
    expect(vencimientos(simple, '2026-11-12', '2026-11-30')).toEqual([]);
  });
});
