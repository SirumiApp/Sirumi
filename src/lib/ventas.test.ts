import { describe, expect, it } from '@jest/globals';

import { aplicarCodigo, informeVentas, normalizarCodigo, validarCodigoDescuento, type CodigoDescuento, type VentaInforme } from './ventas';

const codigos: CodigoDescuento[] = [
  { id: 'c1', codigo: 'NAVIDAD10', tipo: 'porcentaje', valor: 10, activo: true, vence: null },
  { id: 'c2', codigo: 'FERIA5000', tipo: 'monto', valor: 5_000, activo: true, vence: '2026-11-30' },
  { id: 'c3', codigo: 'VIEJO', tipo: 'porcentaje', valor: 50, activo: false, vence: null },
];

describe('D7 · códigos de descuento', () => {
  it('se escribe sin importar mayúsculas ni espacios', () => {
    expect(normalizarCodigo(' navidad10 ')).toBe('NAVIDAD10');
    expect(aplicarCodigo('navidad10', codigos, '2026-11-19')).toEqual({ codigo: 'NAVIDAD10', descuento: { tipo: 'porcentaje', valor: 10 } });
  });
  it('vence al terminar el día; inactivo o inexistente no sirve', () => {
    expect(aplicarCodigo('FERIA5000', codigos, '2026-11-30')).toEqual({ codigo: 'FERIA5000', descuento: { tipo: 'monto', valor: 5_000 } });
    expect(aplicarCodigo('FERIA5000', codigos, '2026-12-01')).toBeNull();
    expect(aplicarCodigo('VIEJO', codigos, '2026-11-19')).toBeNull();
    expect(aplicarCodigo('NADA', codigos, '2026-11-19')).toBeNull();
  });
  it('validar: 3 a 20 letras o números, valor válido y sin repetir', () => {
    expect(validarCodigoDescuento({ codigo: 'AB', tipo: 'porcentaje', valor: 10 }, codigos)).toBe('codigoDescuentoFormato');
    expect(validarCodigoDescuento({ codigo: 'navidad10', tipo: 'porcentaje', valor: 10 }, codigos)).toBe('codigoDescuentoRepetido');
    expect(validarCodigoDescuento({ codigo: 'BLACK', tipo: 'porcentaje', valor: 0 }, codigos)).toBe('codigoDescuentoValor');
    expect(validarCodigoDescuento({ codigo: 'BLACK', tipo: 'porcentaje', valor: 101 }, codigos)).toBe('codigoDescuentoValor');
    expect(validarCodigoDescuento({ codigo: 'BLACK', tipo: 'monto', valor: 20_000 }, codigos)).toBeNull();
  });
});

const venta = (v: Partial<VentaInforme> & Pick<VentaInforme, 'id' | 'total'>): VentaInforme => ({
  fecha: '2026-11-10',
  estado: 'pagada',
  descuento: 0,
  vendedor: null,
  cliente: null,
  pagos: [{ nombre: 'Efectivo', monto: v.total }],
  lineas: [],
  ...v,
});

describe('D8 · informe de ventas', () => {
  const ventas = [
    venta({ id: 'a', total: 100_000, descuento: 10_000, vendedor: 'camila', cliente: 'ana', lineas: [{ variante: 'bolso', nombre: 'Bolso', cantidad: 1, total: 85_000, costo: 37_000 }, { variante: 'gorra', nombre: 'Gorra', cantidad: 1, total: 25_000, costo: null }] }),
    venta({ id: 'b', total: 50_000, pagos: [{ nombre: 'Efectivo', monto: 20_000 }, { nombre: 'Nequi', monto: 30_000 }], lineas: [{ variante: 'bolso', nombre: 'Bolso', cantidad: 2, total: 50_000, costo: 37_000 }] }),
    venta({ id: 'c', total: 30_000, estado: 'devuelta', lineas: [{ variante: 'gorra', nombre: 'Gorra', cantidad: 9, total: 30_000, costo: 1 }] }),
    venta({ id: 'd', total: 999, fecha: '2026-10-31' }),
  ];
  const r = informeVentas(ventas, { desde: '2026-11-01', hasta: '2026-11-30' });
  it('ejemplo del documento: ventas 150.000, 2 ventas, ticket 75.000, 1 devuelta por 30.000', () => {
    expect(r.resumen).toEqual({ ventas: 150_000, numero: 2, ticket: 75_000, descuentos: 10_000, unidades: 4, devueltas: 1, montoDevuelto: 30_000 });
  });
  it('por producto: unidades, ventas y ganancia (sin costo no se calcula), de más a menos vendido', () => {
    expect(r.porProducto).toEqual([
      { clave: 'bolso', nombre: 'Bolso', unidades: 3, ventas: 135_000, ganancia: 135_000 - 37_000 * 3 },
      { clave: 'gorra', nombre: 'Gorra', unidades: 1, ventas: 25_000, ganancia: null },
    ]);
  });
  it('por forma de pago (cada parte en su forma), por vendedor y por cliente', () => {
    expect(r.porForma).toEqual([['Efectivo', 120_000], ['Nequi', 30_000]]);
    expect(r.porVendedor).toEqual([[null, 50_000], ['camila', 100_000]].sort((a, b) => (b[1] as number) - (a[1] as number)));
    expect(r.porCliente).toEqual([['ana', 100_000]]);
  });
});

describe('D4b en el informe', () => {
  it('lo devuelto por partes suma en "devoluciones"', () => {
    const r = informeVentas(
      [
        { id: 'a', fecha: '2026-11-10', estado: 'pagada', total: 54_000, descuento: 0, vendedor: null, cliente: null, pagos: [{ nombre: 'Efectivo', monto: 54_000 }], lineas: [], devuelto: 25_200 },
        { id: 'b', fecha: '2026-11-11', estado: 'devuelta', total: 30_000, descuento: 0, vendedor: null, cliente: null, pagos: [], lineas: [] },
      ],
      { desde: '2026-11-01', hasta: '2026-11-30' },
    );
    expect(r.resumen.montoDevuelto).toBe(55_200);
    expect(r.resumen.ventas).toBe(54_000);
  });
});
