import { describe, expect, it } from '@jest/globals';

import { avanceMeta } from './metasNegocio';

describe('B15 · meta de ventas del mes', () => {
  it('a mitad de mes: vas bien si al ritmo actual llegas', () => {
    // Noviembre (30 días), día 15: vendido 8.000.000 de 15.000.000 → proyección 16.000.000.
    expect(avanceMeta({ meta: 15_000_000, vendido: 8_000_000, hoy: '2026-11-15' })).toEqual({
      porcentaje: 53,
      falta: 7_000_000,
      porDia: 437_500,
      proyeccion: 16_000_000,
      estado: 'vasBien',
    });
  });
  it('atrasado si al ritmo actual no llegas', () => {
    expect(avanceMeta({ meta: 15_000_000, vendido: 5_000_000, hoy: '2026-11-20' }).estado).toBe('atrasado');
  });
  it('lograda: nada por día', () => {
    expect(avanceMeta({ meta: 10_000_000, vendido: 10_500_000, hoy: '2026-11-25' })).toMatchObject({ estado: 'lograda', falta: 0, porDia: 0, porcentaje: 105 });
  });
});
