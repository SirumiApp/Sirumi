// Análisis del mes y topes (docs/reglas-de-calculo.md, A3 y A8). Pruebas escritas antes del código.
import { describe, expect, it } from '@jest/globals';

import { comparacionPorCategoria, cruceDeTope, consejosDelMes, estadosDeTopes, serieMensual } from './analisis';
import type { Movimiento } from './personal';

let n = 0;
const mov = (fecha: string, tipo: 'gasto' | 'ingreso', monto: number, categoria = 'comida'): Movimiento => ({
  id: String(n++),
  fecha,
  tipo,
  monto,
  categoria,
});

describe('gráfica: últimos 6 meses', () => {
  it('gastos e ingresos por mes, del más viejo al actual (hasta hoy)', () => {
    const movs = [
      mov('2026-11-10', 'gasto', 100_000),
      mov('2026-11-12', 'ingreso', 2_000_000, 'ingreso'),
      mov('2026-10-05', 'gasto', 300_000),
      mov('2026-06-01', 'gasto', 50_000),
      mov('2026-05-31', 'gasto', 999_999), // fuera de los 6 meses
    ];
    expect(serieMensual(movs, '2026-11-15', 6)).toEqual([
      { mes: '2026-06', gasto: 50_000, ingreso: 0 },
      { mes: '2026-07', gasto: 0, ingreso: 0 },
      { mes: '2026-08', gasto: 0, ingreso: 0 },
      { mes: '2026-09', gasto: 0, ingreso: 0 },
      { mes: '2026-10', gasto: 300_000, ingreso: 0 },
      { mes: '2026-11', gasto: 100_000, ingreso: 2_000_000 },
    ]);
  });
  it('cruza el cambio de año', () => {
    expect(serieMensual([], '2027-02-10', 6).map((m) => m.mes)).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
  });
});

describe('A3 · estados de los topes del período', () => {
  const alerta = { alertaActiva: true, umbral: 80 };
  it('ejemplos del documento: comida 83% → Cuidado; con 1.300.000 → Superado; sin tope → Sin tope', () => {
    const estados = estadosDeTopes(
      { comida: 1_000_000, shopping: 1_300_000, mercado: 200_000 },
      { comida: 1_200_000, shopping: 1_200_000 },
      { desde: '2026-11-01', hasta: '2026-11-15' },
      '2026-11-15',
      alerta,
    );
    expect(estados).toEqual({
      comida: { gastado: 1_000_000, tope: 1_200_000, estado: 'cuidado', porcentaje: 83 },
      shopping: { gastado: 1_300_000, tope: 1_200_000, estado: 'superado', porcentaje: 108 },
      mercado: { gastado: 200_000, tope: 0, estado: 'sinTope', porcentaje: 0 },
    });
  });
  it('en un rango de 2,5 meses el tope se multiplica', () => {
    const estados = estadosDeTopes({ comida: 2_000_000 }, { comida: 1_000_000 }, { desde: '2026-09-01', hasta: '2026-11-15' }, '2026-11-15', alerta);
    expect(estados.comida).toEqual({ gastado: 2_000_000, tope: 2_500_000, estado: 'cuidado', porcentaje: 80 });
  });
  it('una categoría con tope y sin gastos aparece en 0%', () => {
    expect(estadosDeTopes({}, { salidas: 300_000 }, { desde: '2026-11-01', hasta: '2026-11-15' }, '2026-11-15', alerta).salidas).toEqual({
      gastado: 0,
      tope: 300_000,
      estado: 'normal',
      porcentaje: 0,
    });
  });
});

describe('A2 · comparación por categoría contra el mes anterior', () => {
  it('variación por categoría y sin porcentaje si antes fue 0', () => {
    expect(comparacionPorCategoria({ comida: 900_000, mascotas: 100_000 }, { comida: 1_000_000, mercado: 400_000 })).toEqual([
      { categoria: 'comida', actual: 900_000, anterior: 1_000_000, variacion: -10 },
      { categoria: 'mercado', actual: 0, anterior: 400_000, variacion: -100 },
      { categoria: 'mascotas', actual: 100_000, anterior: 0, variacion: null },
    ]);
  });
});

describe('A8 · consejos del mes', () => {
  const base = {
    gastoMes: 1_800_000,
    ingresosMes: 6_000_000,
    gastoPorCategoria: { shopping: 300_000, comida: 600_000, salidas: 100_000, mercado: 800_000 },
    gastoMesAnterior: 2_000_000,
    hoy: { diaDeHoy: 15, diasDelMes: 30 },
    hormiga: { cantidad: 1, total: 10_000, avisar: false },
    topesSuperados: 0,
  };
  it('ritmo: proyección 3.600.000 supera los 2.000.000 del mes anterior → aviso', () => {
    expect(consejosDelMes(base)).toContainEqual({ tipo: 'ritmoAlto', proyeccion: 3_600_000, anterior: 2_000_000 });
  });
  it('ritmo bien si la proyección no supera el mes anterior', () => {
    expect(consejosDelMes({ ...base, gastoMes: 900_000 })).toContainEqual({ tipo: 'ritmoBien', proyeccion: 1_800_000 });
  });
  it('sin gastos el mes anterior no compara el ritmo', () => {
    const tipos = consejosDelMes({ ...base, gastoMesAnterior: 0 }).map((c) => c.tipo);
    expect(tipos).not.toContain('ritmoAlto');
    expect(tipos).not.toContain('ritmoBien');
  });
  it('shopping > 10% de los ingresos → aviso', () => {
    expect(consejosDelMes(base).map((c) => c.tipo)).not.toContain('shoppingAlto');
    expect(consejosDelMes({ ...base, gastoPorCategoria: { ...base.gastoPorCategoria, shopping: 700_000 } })).toContainEqual({
      tipo: 'shoppingAlto',
      porcentaje: 12,
    });
  });
  it('50/30/20: gustos 1.000.000 de 6.000.000 = 17% → bien; 2.100.000 = 35% → alto', () => {
    expect(consejosDelMes(base)).toContainEqual({ tipo: 'gustosBien', porcentaje: 17 });
    expect(consejosDelMes({ ...base, gastoPorCategoria: { ...base.gastoPorCategoria, comida: 1_700_000 } })).toContainEqual({
      tipo: 'gustosAltos',
      porcentaje: 35,
    });
  });
  it('tasa de ahorro: (6.000.000 − 1.800.000) / 6.000.000 = 70% → bien; menos de 20% → bajo', () => {
    expect(consejosDelMes(base)).toContainEqual({ tipo: 'ahorroBien', tasa: 70 });
    expect(consejosDelMes({ ...base, gastoMes: 5_400_000 })).toContainEqual({ tipo: 'ahorroBajo', tasa: 10 });
  });
  it('sin ingresos no muestra los consejos que dependen de ellos', () => {
    const tipos = consejosDelMes({ ...base, ingresosMes: 0 }).map((c) => c.tipo);
    expect(tipos.filter((t) => /shopping|gustos|ahorro/.test(t))).toEqual([]);
  });
  it('gastos hormiga y topes superados', () => {
    const consejos = consejosDelMes({ ...base, hormiga: { cantidad: 4, total: 60_000, avisar: true }, topesSuperados: 2 });
    expect(consejos).toContainEqual({ tipo: 'hormiga', cantidad: 4, total: 60_000 });
    expect(consejos).toContainEqual({ tipo: 'topesSuperados', cantidad: 2 });
  });
});

describe('A2 · aviso al cruzar el tope', () => {
  it('avisa al cruzar el 80% y al llegar al 100%, una sola vez', () => {
    expect(cruceDeTope({ gastadoAntes: 300_000, monto: 30_000, tope: 400_000, umbral: 80 })).toBe('umbral');
    expect(cruceDeTope({ gastadoAntes: 330_000, monto: 10_000, tope: 400_000, umbral: 80 })).toBeNull();
    expect(cruceDeTope({ gastadoAntes: 380_000, monto: 30_000, tope: 400_000, umbral: 80 })).toBe('tope');
    expect(cruceDeTope({ gastadoAntes: 100_000, monto: 400_000, tope: 400_000, umbral: 80 })).toBe('tope');
    expect(cruceDeTope({ gastadoAntes: 420_000, monto: 5_000, tope: 400_000, umbral: 80 })).toBeNull();
    expect(cruceDeTope({ gastadoAntes: 0, monto: 5_000, tope: 0, umbral: 80 })).toBeNull();
  });
});
