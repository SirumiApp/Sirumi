import { describe, expect, it } from '@jest/globals';

import { es } from '@/i18n/es';

import { etiquetaDia, nombreMes, rangoCorto } from './etiquetas';

const textos = {
  hoy: es.fechas.hoy,
  ayer: es.fechas.ayer,
  mesesCortos: es.fechas.mesesCortos.split(','),
  mesesLargos: es.fechas.mesesLargos.split(','),
};

describe('etiquetas de fechas', () => {
  const hoy = '2026-11-15';
  it('Hoy, Ayer y "13 nov"', () => {
    expect(etiquetaDia('2026-11-15', hoy, textos)).toBe('Hoy');
    expect(etiquetaDia('2026-11-14', hoy, textos)).toBe('Ayer');
    expect(etiquetaDia('2026-11-13', hoy, textos)).toBe('13 nov');
    expect(etiquetaDia('2025-12-31', hoy, textos)).toBe('31 dic 2025');
  });
  it('nombre del mes y rango', () => {
    expect(nombreMes('2026-10-01', textos)).toBe('octubre');
    expect(rangoCorto({ desde: '2026-11-01', hasta: '2026-11-15' }, textos)).toBe('1 nov – 15 nov 2026');
  });
  it('hay 12 meses en cada idioma', () => {
    expect(textos.mesesCortos).toHaveLength(12);
    expect(textos.mesesLargos).toHaveLength(12);
  });
});
