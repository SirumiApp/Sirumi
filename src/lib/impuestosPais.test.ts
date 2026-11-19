import { describe, expect, it } from '@jest/globals';

import { impuestoDelPais, impuestoIncluido, impuestoSobreUtilidad, tasaVentas } from './impuestosPais';

describe('B13 · impuestos por país', () => {
  it('cada país con su impuesto a las ventas', () => {
    expect(impuestoDelPais('CO')).toEqual({ impuesto: 'iva', tasa: 19 });
    expect(impuestoDelPais('PE')).toEqual({ impuesto: 'igv', tasa: 18 });
    expect(impuestoDelPais('MX').tasa).toBe(16);
    expect(impuestoDelPais('US').tasa).toBeNull();
    expect(impuestoDelPais('XX')).toEqual({ impuesto: 'iva', tasa: 19 });
  });
  it('la tarifa: la propia, luego la del año (Colombia), luego la del país', () => {
    expect(tasaVentas('CO', null, 19)).toBe(19);
    expect(tasaVentas('CO', 5, 19)).toBe(5);
    expect(tasaVentas('MX', null, 19)).toBe(16);
    expect(tasaVentas('US')).toBe(0);
    expect(tasaVentas('US', 8.25)).toBe(8.25);
  });
  it('D6: el IVA que va dentro del precio', () => {
    expect(impuestoIncluido(119_000, 19)).toBe(19_000);
    expect(impuestoIncluido(116_000, 16)).toBe(16_000);
    expect(impuestoIncluido(50_000, 0)).toBe(0);
  });
  it('fuera de Colombia: % sobre la utilidad, nunca sobre pérdidas', () => {
    expect(impuestoSobreUtilidad(1_000_000, 30)).toBe(300_000);
    expect(impuestoSobreUtilidad(-500_000, 30)).toBe(0);
    expect(impuestoSobreUtilidad(1_000_000, null)).toBe(0);
  });
});
