import { describe, expect, it } from '@jest/globals';

import { formatearFecha, formatearPesos } from './formato';

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
