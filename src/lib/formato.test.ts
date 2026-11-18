import { describe, expect, it } from '@jest/globals';

import { formatearCorto, formatearFecha, formatearPesos } from './formato';

describe('formatearPesos', () => {
  it('usa punto de miles y no lleva decimales', () => {
    expect(formatearPesos(1250000)).toBe('$ 1.250.000');
    expect(formatearPesos(10000)).toBe('$ 10.000');
    expect(formatearPesos(999)).toBe('$ 999');
    expect(formatearPesos(0)).toBe('$ 0');
  });

  it('redondea al peso más cercano', () => {
    expect(formatearPesos(1499.6)).toBe('$ 1.500');
    expect(formatearPesos(1499.4)).toBe('$ 1.499');
  });

  it('muestra los negativos con signo menos', () => {
    expect(formatearPesos(-5000)).toBe('-$ 5.000');
  });
});

describe('formatearFecha', () => {
  it('escribe día, mes corto y año', () => {
    expect(formatearFecha(new Date(2026, 10, 15))).toBe('15 nov 2026');
    expect(formatearFecha(new Date(2027, 0, 1))).toBe('1 ene 2027');
  });
});

describe('formatearCorto (tarjetas por categoría, como en el prototipo)', () => {
  it('millones con dos decimales y miles redondeados', () => {
    expect(formatearCorto(1_758_341)).toBe('1,76M');
    expect(formatearCorto(338_000)).toBe('338K');
    expect(formatearCorto(92_400)).toBe('92K');
    expect(formatearCorto(850)).toBe('850');
  });
  it('en países con coma de miles, el decimal es punto', () => {
    expect(formatearCorto(1_758_341, ',')).toBe('1.76M');
  });
  it('negativos', () => {
    expect(formatearCorto(-2_500_000)).toBe('-2,50M');
  });
});
