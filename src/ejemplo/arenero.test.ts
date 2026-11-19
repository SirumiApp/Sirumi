import { describe, expect, it } from '@jest/globals';

import { aplicar, armarVentaEjemplo, type CobroEjemplo } from './arenero';

const base: CobroEjemplo = {
  fecha: '2026-11-19',
  bodega: 'feria',
  cliente: null,
  descuento: 0,
  recibido: null,
  iva: null,
  codigo: null,
  lineas: [{ variante: 'cafe', nombre: 'Café', precio: 32_000, cantidad: 2, costo: 14_000 }],
  pagos: [{ nombre: 'Efectivo', cuenta: 'caja', monto: 64_000 }],
};

describe('arenero del modo ejemplo', () => {
  it('lo nuevo va primero, lo editado se cambia y lo borrado se quita', () => {
    const l = { nuevos: [{ id: 'n', v: 1 }], editados: new Map([['a', { id: 'a', v: 9 }]]), borrados: new Set(['b']) };
    expect(aplicar([{ id: 'a', v: 0 }, { id: 'b', v: 0 }], l)).toEqual([{ id: 'n', v: 1 }, { id: 'a', v: 9 }]);
  });
  it('una venta pagada: un movimiento por pago y el stock que sale', () => {
    const r = armarVentaEjemplo(base, 'v1', 25, 'x');
    expect(r.venta).toMatchObject({ total: 64_000, estado: 'pagada', iva: 0 });
    expect(r.movimientos).toEqual([expect.objectContaining({ tipo: 'venta', monto: 64_000, pagado: true, cuenta: 'caja', venta: 'v1' })]);
    expect(r.stock).toEqual([{ variante: 'cafe', bodega: 'feria', cantidad: 2 }]);
  });
  it('D6: IVA incluido (119.000 → 19.000) o sumado (100.000 + 19.000)', () => {
    const una = (precio: number, incluido: boolean) =>
      armarVentaEjemplo({ ...base, lineas: [{ ...base.lineas[0], precio, cantidad: 1 }], iva: { tarifa: 19, incluido } }, 'v', 1, 'x').venta;
    expect(una(119_000, true)).toMatchObject({ total: 119_000, iva: 19_000 });
    expect(una(100_000, false)).toMatchObject({ total: 119_000, iva: 19_000 });
  });
  it('fiado: queda pendiente y sin cuenta', () => {
    const r = armarVentaEjemplo({ ...base, pagos: [{ nombre: 'Fiado', cuenta: null, monto: 64_000 }] }, 'v', 1, 'x');
    expect(r.venta.estado).toBe('fiada');
    expect(r.movimientos[0]).toMatchObject({ pagado: false, cuenta: null });
  });
});
