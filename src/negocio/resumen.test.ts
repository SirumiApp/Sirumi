import { describe, expect, it } from '@jest/globals';

import type { MovNegocio } from '@/lib/negocio';

import { P2026 } from '@/lib/impuestos.fixture';

import { calcularResumen } from './resumen';

let n = 0;
const mov = (m: Partial<MovNegocio> & Pick<MovNegocio, 'tipo' | 'monto'>): MovNegocio => ({ id: `r${n++}`, fecha: '2026-11-10', pagado: true, cuenta: 'davi', tarjeta: null, ...m });

describe('resumen del negocio (B2, B4, B5, B8, B8b, B8c juntos)', () => {
  const r = calcularResumen(
    {
      cuentas: [{ id: 'davi', saldoInicial: 10_000_000 }],
      movimientos: [
        mov({ tipo: 'venta', monto: 9_000_000 }),
        mov({ tipo: 'venta', monto: 1_000_000, pagado: false, cuenta: null }),
        mov({ tipo: 'fijo', monto: 3_200_000 }),
        mov({ tipo: 'variable', monto: 1_000_000 }),
        mov({ tipo: 'retiro', monto: 800_000 }),
        mov({ fecha: '2026-10-05', tipo: 'venta', monto: 8_000_000 }),
      ],
      traslados: [],
      configuracion: { costo_porcentaje: 45, fijos_mes: 3_200_000 },
    },
    { desde: '2026-11-01', hasta: '2026-11-30' },
    { desde: '2026-10-01', hasta: '2026-10-31' },
    { parametros: P2026, regimen: null },
  );
  it('resultados del período con impuestos (ejemplo B5: SIMPLE 160.000 → neta 1.140.000)', () => {
    expect(r.resultados).toMatchObject({ ventas: 10_000_000, costoVentas: 4_500_000, operativa: 1_300_000 });
    expect(r.resultados.impuestos).toBeCloseTo(160_000, 6);
    expect(r.resultados.neta).toBeCloseTo(1_140_000, 6);
    expect(r.impuestos?.masBajo).toBe('natural');
  });
  it('sin parámetros de impuestos la neta es la operativa', () => {
    const sin = calcularResumen(
      { cuentas: [], movimientos: [mov({ tipo: 'venta', monto: 1_000 })], traslados: [], configuracion: {} },
      { desde: '2026-11-01', hasta: '2026-11-30' },
      { desde: '2026-10-01', hasta: '2026-10-31' },
      { parametros: null, regimen: null },
    );
    expect(sin.resultados.neta).toBe(sin.resultados.operativa);
  });
  it('caja con todo lo pagado de todas las fechas, por cobrar y proyección', () => {
    expect(r.caja).toBe(10_000_000 + 9_000_000 - 3_200_000 - 1_000_000 - 800_000 + 8_000_000);
    expect(r.porCobrar).toBe(1_000_000);
    expect(r.proyeccion).toBe(r.caja + 1_000_000);
  });
  it('meses de caja, equilibrio, salud y comparación de ventas', () => {
    expect(r.mesesCaja).toBeCloseTo(r.caja / 4_200_000, 5);
    expect(Math.round(r.equilibrio ?? 0)).toBe(7_111_111);
    expect(r.salud).toEqual({ puntaje: 100, estado: 'saludable' });
    expect(r.variacionVentas).toBe(25);
  });
});

describe('costo de lo vendido con ventas del POS (B5)', () => {
  it('la venta del POS usa su costo real; la venta a mano, el % del negocio', () => {
    const r = calcularResumen(
      {
        cuentas: [{ id: 'davi', saldoInicial: 0 }],
        movimientos: [mov({ tipo: 'venta', monto: 1_000_000 }), mov({ tipo: 'venta', monto: 85_000, venta: 'pos1' })],
        traslados: [],
        configuracion: { costo_porcentaje: 45 },
        ventas: [{ fecha: '2026-11-10', estado: 'pagada', lineas: [{ variante: 'v', nombre: 'Bolso', precio: 85_000, costo: 37_000, cantidad: 1, total: 85_000 }] }] as never,
      },
      { desde: '2026-11-01', hasta: '2026-11-30' },
      { desde: '2026-10-01', hasta: '2026-10-31' },
      { parametros: null, regimen: null },
    );
    expect(r.resultados.ventas).toBe(1_085_000);
    expect(r.resultados.costoVentas).toBe(450_000 + 37_000);
  });
});

describe('D6 · IVA cobrado en el POS', () => {
  it('las ventas cuentan sin el IVA y el IVA cobrado se muestra aparte (las devueltas no)', () => {
    const venta = (id: string, estado: string, iva: number) => ({ id, fecha: '2026-11-10', estado, iva, lineas: [] });
    const r = calcularResumen(
      {
        cuentas: [{ id: 'davi', saldoInicial: 0 }],
        movimientos: [mov({ tipo: 'venta', monto: 119_000, venta: 'v1' }), mov({ tipo: 'venta', monto: 50_000 })],
        traslados: [],
        configuracion: {},
        ventas: [venta('v1', 'pagada', 19_000), venta('v2', 'devuelta', 999)] as never,
      },
      { desde: '2026-11-01', hasta: '2026-11-30' },
      { desde: '2026-10-01', hasta: '2026-10-31' },
      { parametros: null, regimen: null },
    );
    expect(r.resultados.ventas).toBe(150_000);
    expect(r.ivaCobrado).toBe(19_000);
    expect(r.caja).toBe(169_000);
  });
});
