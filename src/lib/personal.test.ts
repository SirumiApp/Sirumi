// Reglas A1, A2, A3, A6, A7 y A8 de docs/reglas-de-calculo.md. Cada ejemplo del documento es una prueba.
import { describe, expect, it } from '@jest/globals';

import {
  abonarDeuda,
  agruparPorDia,
  consejoDelPeriodo,
  deudaPrioritaria,
  estadoTope,
  gastosHormiga,
  gustosSobreIngresos,
  interesesDelMes,
  mesesDelPeriodo,
  patrimonio,
  proyeccionCierre,
  tasaAhorro,
  tasaMensual,
  topeDelPeriodo,
  totalesDelPeriodo,
  variacionPorcentual,
  type Movimiento,
} from './personal';

const mov = (fecha: string, tipo: 'gasto' | 'ingreso', monto: number, categoria: string, id = `${fecha}-${monto}`): Movimiento => ({
  id,
  fecha,
  tipo,
  monto,
  categoria,
});

const noviembre = { desde: '2026-11-01', hasta: '2026-11-30' };

describe('A1 · gastos e ingresos del período', () => {
  const movimientos = [
    mov('2026-11-03', 'gasto', 1_200_000, 'comida'),
    mov('2026-11-10', 'gasto', 600_000, 'mercado'),
    mov('2026-11-01', 'ingreso', 6_000_000, 'ingreso'),
    mov('2026-10-31', 'gasto', 999_999, 'comida'), // fuera del período
  ];
  it('ejemplo del documento: 1.200.000 (comida) + 600.000 (mercado) → gasto total 1.800.000', () => {
    const t = totalesDelPeriodo(movimientos, noviembre);
    expect(t.gasto).toBe(1_800_000);
    expect(t.ingreso).toBe(6_000_000);
    expect(t.gastoPorCategoria).toEqual({ comida: 1_200_000, mercado: 600_000 });
  });
});

describe('A2 · variación contra el período anterior', () => {
  it('ejemplo del documento: noviembre 1.800.000 y octubre 2.000.000 → −10%', () => {
    expect(variacionPorcentual(1_800_000, 2_000_000)).toBe(-10);
  });
  it('si el anterior es 0 no hay porcentaje', () => {
    expect(variacionPorcentual(500_000, 0)).toBeNull();
  });
});

describe('A3 · topes por categoría', () => {
  it('para un mes, el tope tal cual', () => {
    expect(mesesDelPeriodo(noviembre, '2026-11-15')).toBe(1);
    expect(topeDelPeriodo(1_200_000, noviembre, '2026-11-15')).toBe(1_200_000);
  });
  it('para un rango libre: meses = redondear(días / 30,44, 1 decimal), mínimo 1', () => {
    // 1 sep a 15 nov = 76 días → 2,5 meses.
    expect(mesesDelPeriodo({ desde: '2026-09-01', hasta: '2026-11-15' }, '2026-11-15')).toBe(2.5);
    expect(topeDelPeriodo(1_000_000, { desde: '2026-09-01', hasta: '2026-11-15' }, '2026-11-15')).toBe(2_500_000);
    expect(mesesDelPeriodo({ desde: '2026-11-05', hasta: '2026-11-14' }, '2026-11-15')).toBe(1);
  });
  it('ejemplo del documento: tope 1.200.000, gastado 1.000.000 → 83% → "Cuidado"', () => {
    expect(estadoTope(1_000_000, 1_200_000, { alertaActiva: true, umbral: 80 })).toEqual({ estado: 'cuidado', porcentaje: 83 });
  });
  it('ejemplo del documento: gastado 1.300.000 → "Superado"', () => {
    expect(estadoTope(1_300_000, 1_200_000, { alertaActiva: true, umbral: 80 })).toEqual({ estado: 'superado', porcentaje: 108 });
  });
  it('justo en el tope (100%) no está superado', () => {
    expect(estadoTope(1_200_000, 1_200_000, { alertaActiva: true, umbral: 80 }).estado).toBe('cuidado');
  });
  it('sin alerta activa muestra el porcentaje', () => {
    expect(estadoTope(1_000_000, 1_200_000, { alertaActiva: false, umbral: 80 })).toEqual({ estado: 'normal', porcentaje: 83 });
  });
  it('categoría sin tope', () => {
    expect(estadoTope(500_000, 0, { alertaActiva: true, umbral: 80 })).toEqual({ estado: 'sinTope', porcentaje: 0 });
  });
});

describe('A6 · deudas', () => {
  it('ejemplo del documento: 28% EA → tasa mensual 2,078% → unos 49.883 de intereses sobre 2.400.000', () => {
    expect(tasaMensual(28) * 100).toBeCloseTo(2.078, 3);
    expect(Math.round(interesesDelMes(2_400_000, 28))).toBe(49_883);
  });
  it('prioridad: la deuda con saldo > 0 y mayor tasa (avalancha)', () => {
    const deudas = [
      { id: 'a', saldo: 2_400_000, tasaEA: 28 },
      { id: 'b', saldo: 0, tasaEA: 40 },
      { id: 'c', saldo: 5_000_000, tasaEA: 18 },
    ];
    expect(deudaPrioritaria(deudas)?.id).toBe('a');
    expect(deudaPrioritaria([{ id: 'x', saldo: 0, tasaEA: 10 }])).toBeNull();
  });
  it('abonar nunca deja el saldo negativo', () => {
    expect(abonarDeuda(300_000, 500_000)).toBe(0);
    expect(abonarDeuda(1_000_000, 200_000)).toBe(800_000);
  });
});

describe('A7 · patrimonio', () => {
  it('activos + ahorrado en metas − deudas', () => {
    expect(patrimonio({ activos: 10_000_000, ahorradoEnMetas: 1_500_000, deudas: 7_400_000 })).toBe(4_100_000);
  });
});

describe('A8 · análisis del mes', () => {
  it('proyección de cierre = gastado / día de hoy × días del mes', () => {
    expect(proyeccionCierre(1_800_000, { diaDeHoy: 15, diasDelMes: 30 })).toBe(3_600_000);
  });
  it('tasa de ahorro = redondear((ingresos − gastos) / ingresos × 100)', () => {
    expect(tasaAhorro(6_000_000, 4_800_000)).toBe(20);
    expect(tasaAhorro(0, 100_000)).toBeNull();
  });
  it('gustos (shopping + comida fuera + salidas) / ingresos', () => {
    const t = { shopping: 900_000, comida: 600_000, salidas: 300_000, mercado: 1_000_000 };
    expect(gustosSobreIngresos(t, 6_000_000)).toBe(30);
  });
  it('gastos hormiga: menores de 25.000; se avisa si hay 3 o más', () => {
    const movs = [
      mov('2026-11-02', 'gasto', 8_000, 'comida', '1'),
      mov('2026-11-03', 'gasto', 24_999, 'comida', '2'),
      mov('2026-11-04', 'gasto', 25_000, 'comida', '3'),
      mov('2026-11-05', 'ingreso', 10_000, 'ingreso', '4'),
    ];
    expect(gastosHormiga(movs, noviembre)).toEqual({ cantidad: 2, total: 32_999, avisar: false });
    expect(gastosHormiga([...movs, mov('2026-11-06', 'gasto', 5_000, 'mercado', '5')], noviembre).avisar).toBe(true);
  });
});

describe('Inicio: consejo del período y lista por días', () => {
  it('la categoría más grande y cuánto ahorraría si la baja a su tope', () => {
    const consejo = consejoDelPeriodo({ shopping: 1_700_000, comida: 1_480_000, mercado: 166_000 }, { shopping: 1_200_000 }, 1);
    expect(consejo).toEqual({ categoria: 'shopping', porcentaje: 51, tope: 1_200_000, ahorro: 500_000 });
  });
  it('si no pasa el tope, no hay ahorro', () => {
    expect(consejoDelPeriodo({ comida: 300_000, mercado: 100_000 }, {}, 1)).toEqual({ categoria: 'comida', porcentaje: 75, tope: null, ahorro: null });
  });
  it('sin gastos no hay consejo', () => {
    expect(consejoDelPeriodo({}, {}, 1)).toBeNull();
  });
  it('agrupa por día, del más reciente al más antiguo, con el total de gastos del día', () => {
    const grupos = agruparPorDia([
      mov('2026-11-14', 'gasto', 20_000, 'comida', 'a'),
      mov('2026-11-15', 'gasto', 50_000, 'mercado', 'b'),
      mov('2026-11-15', 'ingreso', 1_000_000, 'ingreso', 'c'),
      mov('2026-11-15', 'gasto', 30_000, 'comida', 'd'),
    ]);
    expect(grupos.map((g) => [g.fecha, g.totalGastos, g.movimientos.length])).toEqual([
      ['2026-11-15', 80_000, 3],
      ['2026-11-14', 20_000, 1],
    ]);
  });
});
