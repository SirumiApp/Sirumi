import { describe, expect, it } from '@jest/globals';

import { apartarDeCada, balance, cajaAntesDe, cartera, duenoYCapital, entradasYSalidas, flujoDelPeriodo } from './informes';
import { cajaTotal, type MovNegocio, type Transferencia } from './negocio';

let n = 0;
const mov = (m: Partial<MovNegocio> & Pick<MovNegocio, 'tipo' | 'monto'>): MovNegocio => ({ id: `i${n++}`, fecha: '2026-11-10', pagado: true, cuenta: 'davi', tarjeta: null, ...m });
const cuentas = [
  { id: 'davi', saldoInicial: 3_000_000 },
  { id: 'efectivo', saldoInicial: 0 },
];
const noviembre = { desde: '2026-11-01', hasta: '2026-11-18' };

describe('flujo de caja del período (B6)', () => {
  const movs = [
    mov({ fecha: '2026-10-20', tipo: 'venta', monto: 1_000_000 }),
    mov({ tipo: 'venta', monto: 500_000 }),
    mov({ tipo: 'venta', monto: 400_000, pagado: false, cuenta: null }),
    mov({ tipo: 'fijo', monto: 1_300_000 }),
    mov({ tipo: 'variable', monto: 300_000, cuenta: null, tarjeta: 'visa' }),
    mov({ tipo: 'inversion', monto: 200_000 }),
    mov({ tipo: 'aporte', monto: 1_000_000 }),
    mov({ tipo: 'retiro', monto: 100_000 }),
  ];
  const traslados: Transferencia[] = [
    { fecha: '2026-11-12', desde: 'davi', haciaCuenta: 'efectivo', haciaTarjeta: null, monto: 200_000 },
    { fecha: '2026-11-15', desde: 'davi', haciaCuenta: null, haciaTarjeta: 'visa', monto: 150_000 },
  ];
  it('la caja al inicio es todo lo anterior al período', () => {
    expect(cajaAntesDe('2026-11-01', cuentas, movs, traslados)).toBe(4_000_000);
  });
  it('el saldo al cierre coincide con la caja de hoy (B4)', () => {
    const f = flujoDelPeriodo(noviembre, cuentas, movs, traslados);
    expect(f.operacion).toBe(500_000 - 1_300_000);
    expect(f.inversion).toBe(-200_000);
    expect(f.financiacion).toBe(1_000_000 - 100_000 - 150_000);
    expect(f.cierre).toBe(cajaTotal(cuentas, movs, traslados));
  });
});

describe('entradas y salidas', () => {
  it('suma por tipo, cobradas o no, ordenadas de mayor a menor', () => {
    const r = entradasYSalidas(
      [mov({ tipo: 'venta', monto: 100 }), mov({ tipo: 'venta', monto: 50, pagado: false }), mov({ tipo: 'fijo', monto: 80 }), mov({ fecha: '2026-10-01', tipo: 'fijo', monto: 999 })],
      noviembre,
    );
    expect(r).toEqual({ entradas: 150, salidas: 80, filas: [{ tipo: 'venta', monto: 150, entra: true }, { tipo: 'fijo', monto: 80, entra: false }] });
  });
});

describe('cartera por antigüedad', () => {
  it('separa lo que te deben de lo que debes, por días', () => {
    const r = cartera(
      [
        mov({ fecha: '2026-11-10', tipo: 'venta', monto: 100, pagado: false }),
        mov({ fecha: '2026-09-25', tipo: 'venta', monto: 200, pagado: false }),
        mov({ fecha: '2026-07-01', tipo: 'venta', monto: 300, pagado: false }),
        mov({ fecha: '2026-10-10', tipo: 'compra', monto: 50, pagado: false }),
        mov({ tipo: 'venta', monto: 999 }),
      ],
      '2026-11-18',
    );
    expect(r.porCobrar.total).toBe(600);
    expect(r.porCobrar.tramos).toEqual({ al30: 100, al60: 200, al90: 0, mas90: 300 });
    expect(r.porCobrar.lista[0].fecha).toBe('2026-07-01');
    expect(r.porPagar.tramos).toEqual({ al30: 0, al60: 50, al90: 0, mas90: 0 });
  });
});

describe('dueño y capital', () => {
  it('aportes + utilidad − retiros', () => {
    const r = duenoYCapital([mov({ tipo: 'aporte', monto: 1_000_000 }), mov({ tipo: 'retiro', monto: 800_000 }), mov({ tipo: 'prestamo', monto: 500_000 })], noviembre, 1_140_000);
    expect(r).toEqual({ aportes: 1_000_000, retiros: 800_000, neta: 1_140_000, prestamos: 500_000, queda: 1_340_000 });
  });
});

describe('balance y patrimonio', () => {
  it('lo que tienes − lo que debes, con la deuda de cada tarjeta (B3)', () => {
    const movs = [mov({ tipo: 'variable', monto: 300_000, cuenta: null, tarjeta: 'visa' })];
    const traslados: Transferencia[] = [{ fecha: '2026-11-12', desde: 'davi', haciaCuenta: null, haciaTarjeta: 'visa', monto: 500_000 }];
    const r = balance({
      cuentas,
      tarjetas: [{ id: 'visa', cupo: 5_000_000, deudaInicial: 1_200_000 }],
      movs,
      traslados,
      porCobrar: 1_000_000,
      porPagar: 2_000_000,
      equipos: 4_000_000,
      inventario: 0,
    });
    expect(r.caja).toBe(2_500_000);
    expect(r.tarjetas).toEqual([{ id: 'visa', deuda: 1_000_000 }]);
    expect(r.tienes).toBe(7_500_000);
    expect(r.debes).toBe(3_000_000);
    expect(r.patrimonio).toBe(4_500_000);
  });
});

describe('cuánto apartar para impuestos', () => {
  it('SIMPLE de 160.000 sobre ventas de 10.000.000 → 1.600 de cada 100.000', () => {
    expect(apartarDeCada(160_000, 10_000_000)).toBe(1_600);
    expect(apartarDeCada(100, 0)).toBe(0);
  });
});
