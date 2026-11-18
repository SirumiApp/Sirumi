// B7 · Impuestos estimados (docs/reglas-de-calculo.md). Orientativos: no reemplazan al contador.
// Los parámetros reales vienen de la tabla tax_parameters (uno por año); aquí se usan los de 2026 del documento.
import { describe, expect, it } from '@jest/globals';

import { baseSinIva, impuestosEstimados } from './impuestos';
import { P2026 } from './impuestos.fixture';


describe('B7 · impuestos estimados (ejemplos del documento)', () => {
  const r = impuestosEstimados({ ventas: 10_000_000, operativa: 1_300_000, diasPeriodo: 30, grupo: 2 }, P2026);

  it('SIMPLE: 10.000.000 en 30 días → 381,9 UVT por bimestre → primer rango → grupo 2 → 1,6% → 160.000', () => {
    expect(r.uvtBimestre).toBeCloseTo(381.9, 1);
    expect(r.tarifaSimple).toBe(1.6);
    expect(r.simple).toBeCloseTo(160_000, 6);
  });
  it('ICA: 10.000.000 × 9,66 por mil = 96.600', () => {
    expect(r.ica).toBeCloseTo(96_600, 6);
  });
  it('Ordinario (SAS): 35% de la utilidad operativa + ICA', () => {
    expect(r.ordinario).toBeCloseTo(1_300_000 * 0.35 + 96_600, 6);
  });
  it('Persona natural: tabla del art. 241 sobre la utilidad anualizada en UVT (15.600.000 ≈ 298 UVT → 0) + ICA', () => {
    expect(r.natural).toBeCloseTo(96_600, 6);
  });
  it('marca el más bajo de los tres', () => {
    expect(r.masBajo).toBe('natural');
  });
  it('no avisa del tope de 3.500 UVT con ventas de 120.000.000 al año', () => {
    expect(r.superaTope).toBe(false);
  });
});

describe('B7 · casos más grandes', () => {
  it('ventas de 20.000.000 al mes (240.000.000 al año) superan el tope de 3.500 UVT (183.309.000)', () => {
    expect(impuestosEstimados({ ventas: 20_000_000, operativa: 3_000_000, diasPeriodo: 30, grupo: 2 }, P2026).superaTope).toBe(true);
  });
  it('el rango del SIMPLE sube con las ventas del bimestre', () => {
    // 60.000.000 en 30 días → 2.291 UVT por bimestre → segundo rango → grupo 1 → 2,8%.
    const r = impuestosEstimados({ ventas: 60_000_000, operativa: 5_000_000, diasPeriodo: 30, grupo: 1 }, P2026);
    expect(r.tarifaSimple).toBe(2.8);
  });
  it('persona natural en el tramo del 28%: utilidad 10.000.000 al mes → 2.291 UVT al año', () => {
    const r = impuestosEstimados({ ventas: 0, operativa: 10_000_000, diasPeriodo: 30, grupo: 2 }, P2026);
    const uvtAnio = (10_000_000 * 12) / 52_374;
    const esperado = (((uvtAnio - 1_700) * 0.28 + 116) * 52_374) / 12;
    expect(r.natural).toBeCloseTo(esperado, 4);
  });
  it('con pérdida no hay impuesto sobre la utilidad (solo SIMPLE e ICA sobre ventas)', () => {
    const r = impuestosEstimados({ ventas: 5_000_000, operativa: -1_000_000, diasPeriodo: 30, grupo: 2 }, P2026);
    expect(r.ordinario).toBeCloseTo(48_300, 6);
    expect(r.natural).toBeCloseTo(48_300, 6);
  });
  it('un período de 15 días se lleva a 60 días para el bimestre', () => {
    expect(impuestosEstimados({ ventas: 5_000_000, operativa: 0, diasPeriodo: 15, grupo: 2 }, P2026).uvtBimestre).toBeCloseTo((5_000_000 * 4) / 52_374, 6);
  });
});

describe('B7 · base sin IVA para negocios responsables de IVA', () => {
  it('119.000 → 100.000', () => {
    expect(baseSinIva(119_000, 19)).toBe(100_000);
  });
});
