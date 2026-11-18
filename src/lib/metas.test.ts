// Metas, deudas y patrimonio (docs/reglas-de-calculo.md, A5, A6 y A7). Pruebas escritas antes del código.
import { describe, expect, it } from '@jest/globals';

import { patrimonioActual, resumenDeudas, resumenMeta, serieDePatrimonio } from './metas';

const METAS = [
  { id: 'm1', objetivo: 10_000_000, ahorrado: 3_500_000 },
  { id: 'm2', objetivo: 4_000_000, ahorrado: 1_200_000 },
  { id: 'm3', objetivo: 3_500_000, ahorrado: 2_800_000 },
];
const DEUDAS = [
  { id: 'd1', saldo: 2_400_000, tasaEA: 28 },
  { id: 'd2', saldo: 8_000_000, tasaEA: 19 },
  { id: 'd3', saldo: 500_000, tasaEA: 0 },
];

describe('A5 · resumen de una meta', () => {
  it('progreso, lo que falta y si está cumplida', () => {
    expect(resumenMeta({ objetivo: 4_000_000, ahorrado: 1_200_000 })).toEqual({ porcentaje: 30, faltan: 2_800_000, cumplida: false });
    expect(resumenMeta({ objetivo: 4_000_000, ahorrado: 4_000_000 })).toEqual({ porcentaje: 100, faltan: 0, cumplida: true });
  });
});

describe('A6 · resumen de deudas', () => {
  it('total, intereses del mes y la que conviene pagar primero (avalancha)', () => {
    const r = resumenDeudas(DEUDAS);
    expect(r.total).toBe(10_900_000);
    // 2.400.000 al 28% EA ≈ 49.883 + 8.000.000 al 19% EA ≈ 116.817 + 0.
    expect(Math.round(r.interesesMes)).toBe(Math.round(2_400_000 * (Math.pow(1.28, 1 / 12) - 1) + 8_000_000 * (Math.pow(1.19, 1 / 12) - 1)));
    expect(r.prioritaria?.id).toBe('d1');
  });
  it('sin deudas con saldo no hay prioridad', () => {
    expect(resumenDeudas([{ id: 'x', saldo: 0, tasaEA: 30 }])).toEqual({ total: 0, interesesMes: 0, prioritaria: null });
  });
});

describe('A7 · patrimonio', () => {
  it('ejemplo del documento: activos 15.200.000 + metas 7.500.000 − deudas 10.900.000 = 11.800.000', () => {
    const activos = [{ valor: 3_200_000 }, { valor: 5_000_000 }, { valor: 7_000_000 }];
    expect(patrimonioActual(activos, METAS, DEUDAS)).toEqual({ activos: 15_200_000, ahorradoEnMetas: 7_500_000, deudas: 10_900_000, neto: 11_800_000 });
  });
  it('puede ser negativo si se debe más de lo que se tiene', () => {
    expect(patrimonioActual([{ valor: 1_000_000 }], [], [{ saldo: 3_000_000 }]).neto).toBe(-2_000_000);
  });
});

describe('A7 · evolución del patrimonio (últimos 6 meses)', () => {
  it('un mes sin foto repite el anterior; antes de la primera foto queda vacío', () => {
    const fotos = [
      { mes: '2026-07', neto: -1_900_000 },
      { mes: '2026-09', neto: 900_000 },
      { mes: '2026-11', neto: 11_800_000 },
    ];
    expect(serieDePatrimonio(fotos, '2026-11-18', 6)).toEqual([
      { mes: '2026-06', neto: null },
      { mes: '2026-07', neto: -1_900_000 },
      { mes: '2026-08', neto: -1_900_000 },
      { mes: '2026-09', neto: 900_000 },
      { mes: '2026-10', neto: 900_000 },
      { mes: '2026-11', neto: 11_800_000 },
    ]);
  });
  it('si la primera foto es de antes de los 6 meses, la arrastra', () => {
    expect(serieDePatrimonio([{ mes: '2026-01', neto: 500_000 }], '2026-11-18', 3)).toEqual([
      { mes: '2026-09', neto: 500_000 },
      { mes: '2026-10', neto: 500_000 },
      { mes: '2026-11', neto: 500_000 },
    ]);
  });
});
