import { describe, expect, it } from '@jest/globals';

import type { MovNegocio } from '@/lib/negocio';

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
  );
  it('resultados del período (ejemplo B5 sin impuestos)', () => {
    expect(r.resultados).toMatchObject({ ventas: 10_000_000, costoVentas: 4_500_000, operativa: 1_300_000, neta: 1_300_000 });
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
