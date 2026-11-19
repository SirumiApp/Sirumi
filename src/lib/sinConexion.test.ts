import { describe, expect, it } from '@jest/globals';

import { conLimite, esErrorDeConexion, idDeVenta, stockConPendientes } from './sinConexion';

describe('POS sin internet', () => {
  it('reconoce los errores de conexión y no confunde los de la venta', () => {
    expect(esErrorDeConexion({ message: 'TypeError: Network request failed' })).toBe(true);
    expect(esErrorDeConexion({ message: 'Failed to fetch' })).toBe(true);
    expect(esErrorDeConexion(new Error('timeout'))).toBe(true);
    expect(esErrorDeConexion({ message: 'stockInsuficiente', code: 'P0001' })).toBe(false);
    expect(esErrorDeConexion({ message: 'pagosNoCuadran' })).toBe(false);
    expect(esErrorDeConexion(null)).toBe(false);
  });
  it('el id de la venta tiene forma de UUID v4', () => {
    expect(idDeVenta()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(idDeVenta()).not.toBe(idDeVenta());
  });
  it('el stock que se ve descuenta lo vendido sin internet, sin bajar de 0', () => {
    const stock = [
      { variante: 'taza', bodega: 'feria', cantidad: 5 },
      { variante: 'taza', bodega: 'local', cantidad: 9 },
      { variante: 'cafe', bodega: 'feria', cantidad: 1 },
    ];
    const r = stockConPendientes(stock, [
      { bodega: 'feria', lineas: [{ variante: 'taza', cantidad: 2 }, { variante: null, cantidad: 1 }] },
      { bodega: 'feria', lineas: [{ variante: 'cafe', cantidad: 3 }] },
    ]);
    expect(r).toEqual([
      { variante: 'taza', bodega: 'feria', cantidad: 3 },
      { variante: 'taza', bodega: 'local', cantidad: 9 },
      { variante: 'cafe', bodega: 'feria', cantidad: 0 },
    ]);
  });
  it('si el servidor no responde a tiempo, falla como sin conexión', async () => {
    await expect(conLimite(new Promise(() => {}), 10)).rejects.toThrow('timeout');
    await expect(conLimite(Promise.resolve(7), 50)).resolves.toBe(7);
  });
});
