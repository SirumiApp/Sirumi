import { describe, expect, it } from '@jest/globals';

import { diaHabil, fechaPorDigito, festivosColombia, ivaPorPagar, obligacionesDe, pascua, periodoIvaDe, vencimientos, type PerfilTributario } from './calendarioTributario';

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

describe('B12b · IVA por pagar', () => {
  const ivas = [
    { fecha: '2026-09-15', iva: 100_000 },
    { fecha: '2026-10-20', iva: 50_000 },
    { fecha: '2026-11-05', iva: 30_000 },
    { fecha: '2026-11-18', iva: 20_000 },
  ];
  it('períodos: bimestre, cuatrimestre y año', () => {
    expect(periodoIvaDe('2026-11-19', 'bimestral')).toEqual({ desde: '2026-11-01', hasta: '2026-12-31' });
    expect(periodoIvaDe('2026-11-19', 'cuatrimestral')).toEqual({ desde: '2026-09-01', hasta: '2026-12-31' });
    expect(periodoIvaDe('2026-02-10', 'anual')).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' });
  });
  it('bimestral: el bimestre en curso más sep-oct mientras no venza (vence 20 nov)', () => {
    const r = ivaPorPagar(ivas, '2026-11-19', 'bimestral', () => '2026-11-20');
    expect(r.abierto.monto).toBe(50_000);
    expect(r.anterior).toMatchObject({ desde: '2026-09-01', hasta: '2026-10-31', monto: 150_000 });
    expect(r.total).toBe(200_000);
  });
  it('después de la fecha de pago, el anterior ya no se debe', () => {
    expect(ivaPorPagar(ivas, '2026-11-25', 'bimestral', () => '2026-11-20').total).toBe(50_000);
  });
  it('sin fecha conocida, se sigue contando', () => {
    expect(ivaPorPagar(ivas, '2026-11-25', 'bimestral', () => null).total).toBe(200_000);
  });
});
