import { describe, expect, it } from '@jest/globals';

import { cabeEnCarrito, cierreDelDia, costoDeVentas, devolucionParcial, dividirPago, numeroVenta, repartir, sugerenciasEfectivo, totalesVenta, validarCobro, vuelto, type LineaCarrito } from './pos';

const bolso: LineaCarrito = { clave: 'bolso', variante: 'v-bolso', nombre: 'Bolso', precio: 85_000, cantidad: 1 };

describe('D1 · totales', () => {
  it('ejemplo del documento: bolso 85.000, 10% → descuento 8.500 → total 76.500', () => {
    expect(totalesVenta([bolso], { tipo: 'porcentaje', valor: 10 })).toMatchObject({ subtotal: 85_000, descuento: 8_500, total: 76_500 });
  });
  it('subtotal = Σ precio × cantidad; sin descuento el total es el subtotal', () => {
    expect(totalesVenta([bolso, { ...bolso, clave: 'b2', precio: 12_000, cantidad: 3 }], null)).toMatchObject({ subtotal: 121_000, descuento: 0, total: 121_000 });
  });
  it('el porcentaje se redondea y el monto fijo nunca pasa del subtotal', () => {
    expect(totalesVenta([{ ...bolso, precio: 33_333 }], { tipo: 'porcentaje', valor: 15 }).descuento).toBe(5_000);
    expect(totalesVenta([bolso], { tipo: 'monto', valor: 999_999 })).toMatchObject({ subtotal: 85_000, descuento: 85_000, total: 0 });
    expect(totalesVenta([bolso], { tipo: 'porcentaje', valor: 150 }).descuento).toBe(85_000);
  });
});

describe('D2 · disponibilidad en la bodega elegida', () => {
  it('no deja agregar más de lo que hay (contando lo que ya está en el carrito)', () => {
    expect(cabeEnCarrito('v-bolso', 2, [bolso])).toBe(true);
    expect(cabeEnCarrito('v-bolso', 1, [bolso])).toBe(false);
    expect(cabeEnCarrito(null, 0, [])).toBe(true); // venta libre: sin stock
  });
});

describe('D3 · formas de pago', () => {
  it('vuelto = recibido − total, solo si recibió más', () => {
    expect(vuelto(100_000, 76_500)).toBe(23_500);
    expect(vuelto(50_000, 76_500)).toBe(0);
  });
  it('ejemplo: 100.000 dividido 25% + 75% → 25.000 + 75.000; la segunda parte cuadra el redondeo', () => {
    expect(dividirPago(100_000, 25)).toEqual([25_000, 75_000]);
    expect(dividirPago(76_501, 50)).toEqual([38_251, 38_250]);
  });
  it('billetes sugeridos: exacto y redondeos hacia arriba, sin repetir', () => {
    expect(sugerenciasEfectivo(76_500)).toEqual([76_500, 80_000, 100_000]);
    expect(sugerenciasEfectivo(20_000)).toEqual([20_000, 50_000, 100_000]);
    expect(sugerenciasEfectivo(0)).toEqual([]);
  });
});

describe('validar el cobro', () => {
  const base = { lineas: [bolso], total: 76_500, forma: 'efectivo' as string | null, fiado: false, cliente: null as string | null, dividido: false, segundaForma: null as string | null };
  it('carrito vacío, sin forma de pago o fiado sin cliente no se cobra', () => {
    expect(validarCobro({ ...base, lineas: [] })).toBe('carritoVacio');
    expect(validarCobro({ ...base, forma: null })).toBe('sinFormaPago');
    expect(validarCobro({ ...base, fiado: true })).toBe('fiadoSinCliente');
    expect(validarCobro({ ...base, fiado: true, cliente: 'ana', dividido: true, segundaForma: 'nequi' })).toBe('fiadoNoDivide');
  });
  it('pago dividido necesita una segunda forma distinta', () => {
    expect(validarCobro({ ...base, dividido: true })).toBe('sinSegundaForma');
    expect(validarCobro({ ...base, dividido: true, segundaForma: 'efectivo' })).toBe('sinSegundaForma');
    expect(validarCobro({ ...base, dividido: true, segundaForma: 'nequi' })).toBeNull();
    expect(validarCobro(base)).toBeNull();
  });
});

describe('número de la venta', () => {
  it('POS-0001, POS-0002…', () => {
    expect(numeroVenta(1)).toBe('POS-0001');
    expect(numeroVenta(12345)).toBe('POS-12345');
  });
});

describe('B5 · costo de lo vendido con el costo real del POS', () => {
  it('ventas del POS a su costo real; ventas a mano y líneas libres con el % del negocio; devueltas no cuentan', () => {
    const r = costoDeVentas({
      ventasManuales: 1_000_000,
      ventasPos: [
        { fecha: '2026-11-10', costoConocido: 37_000, montoLibre: 0, devuelta: false },
        { fecha: '2026-11-11', costoConocido: 0, montoLibre: 100_000, devuelta: false },
        { fecha: '2026-11-12', costoConocido: 50_000, montoLibre: 0, devuelta: true },
        { fecha: '2026-10-30', costoConocido: 99_000, montoLibre: 0, devuelta: false },
      ],
      costoPorcentaje: 45,
      periodo: { desde: '2026-11-01', hasta: '2026-11-30' },
    });
    expect(r).toBe(1_000_000 * 0.45 + 37_000 + 100_000 * 0.45);
  });
});

describe('cierre del día', () => {
  it('suma las ventas del día por forma de pago y por cuenta; las devueltas y las de otro día no cuentan', () => {
    const v = (fecha: string, estado: string, pagos: { nombre: string; cuenta: string | null; monto: number }[]) => ({ fecha, estado, total: pagos.reduce((s, p) => s + p.monto, 0), pagos });
    const r = cierreDelDia(
      [
        v('2026-11-19', 'pagada', [{ nombre: 'Efectivo', cuenta: 'efe', monto: 25_000 }, { nombre: 'Nequi', cuenta: 'nequi', monto: 75_000 }]),
        v('2026-11-19', 'pagada', [{ nombre: 'Efectivo', cuenta: 'efe', monto: 40_000 }]),
        v('2026-11-19', 'fiada', [{ nombre: 'Fiado', cuenta: null, monto: 20_000 }]),
        v('2026-11-19', 'devuelta', [{ nombre: 'Efectivo', cuenta: 'efe', monto: 999 }]),
        v('2026-11-18', 'pagada', [{ nombre: 'Efectivo', cuenta: 'efe', monto: 999 }]),
      ],
      '2026-11-19',
    );
    expect(r.ventas).toBe(3);
    expect(r.total).toBe(160_000);
    expect(r.porForma).toEqual([['Nequi', 75_000], ['Efectivo', 65_000], ['Fiado', 20_000]]);
    expect(r.porCuenta).toEqual([['nequi', 75_000], ['efe', 65_000], [null, 20_000]]);
  });
});

describe('D6 · IVA en el POS', () => {
  const iva19 = { tarifa: 19, incluido: true };
  it('ejemplo: IVA incluido, 119.000 → base 100.000, IVA 19.000, total 119.000', () => {
    expect(totalesVenta([{ ...bolso, precio: 119_000 }], null, iva19)).toEqual({ subtotal: 119_000, descuento: 0, base: 100_000, iva: 19_000, total: 119_000 });
  });
  it('ejemplo: sumar IVA, 100.000 → IVA 19.000 → total 119.000', () => {
    expect(totalesVenta([{ ...bolso, precio: 100_000 }], null, { tarifa: 19, incluido: false })).toEqual({ subtotal: 100_000, descuento: 0, base: 100_000, iva: 19_000, total: 119_000 });
  });
  it('con descuento: el IVA se calcula sobre lo que de verdad paga', () => {
    expect(totalesVenta([bolso], { tipo: 'porcentaje', valor: 10 }, iva19)).toEqual({ subtotal: 85_000, descuento: 8_500, base: 64_286, iva: 12_214, total: 76_500 });
  });
  it('sin IVA (no responsable): base = total e IVA 0', () => {
    expect(totalesVenta([bolso], null)).toMatchObject({ base: 85_000, iva: 0, total: 85_000 });
  });
});

describe('D4b · devolución parcial', () => {
  it('repartir sin perder pesos', () => {
    expect(repartir(100, [1, 1, 1])).toEqual([33, 33, 34]);
    expect(repartir(50_000, [25, 75])).toEqual([12_500, 37_500]);
  });
  it('devuelve una taza de una venta con 10% de descuento pagada mitad y mitad', () => {
    // 2 tazas de 28.000 + café 32.000 = 88.000; 10% → 79.200 (efectivo 39.600 + Nequi 39.600).
    const r = devolucionParcial({ subtotal: 88_000, descuento: 8_800, total: 79_200, iva: 0, pagos: [39_600, 39_600] }, [{ precio: 28_000, cantidad: 1 }]);
    expect(r).toEqual({ reembolso: 25_200, subtotal: 60_000, descuento: 6_000, total: 54_000, iva: 0, pagos: [27_000, 27_000], completa: false });
  });
  it('con IVA incluido, el IVA baja en proporción', () => {
    const r = devolucionParcial({ subtotal: 119_000, descuento: 0, total: 119_000, iva: 19_000, pagos: [119_000] }, [{ precio: 59_500, cantidad: 1 }]);
    expect(r).toMatchObject({ reembolso: 59_500, total: 59_500, iva: 9_500 });
  });
  it('si se devuelve todo, es una devolución completa', () => {
    expect(devolucionParcial({ subtotal: 28_000, descuento: 0, total: 28_000, iva: 0, pagos: [28_000] }, [{ precio: 28_000, cantidad: 1 }])).toMatchObject({ completa: true, reembolso: 28_000 });
  });
});
