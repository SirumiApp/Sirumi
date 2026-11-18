import { describe, expect, it } from '@jest/globals';

import {
  armarVariantes,
  codigoInterno,
  costoUnitario,
  digitoControlEan13,
  esEan13Valido,
  margenProducto,
  porReponer,
  stockDeProducto,
  stockDeVariante,
  validarProducto,
  validarSalida,
  valorInventario,
  type FilaStock,
} from './inventario';

describe('C1 · costo por unidad y margen', () => {
  it('costo = materia prima + mano de obra + empaque + otros', () => {
    expect(costoUnitario({ materia: 25_000, manoDeObra: 8_000, empaque: 2_500, otros: 1_500 })).toBe(37_000);
  });
  it('ejemplo: precio 85.000, costo 37.000 → ganas 48.000 → margen 56,5%', () => {
    expect(margenProducto(85_000, 37_000)).toEqual({ ganancia: 48_000, margen: 0.5647058823529412 });
    expect(Math.round(margenProducto(85_000, 37_000).margen * 1000) / 10).toBe(56.5);
    expect(margenProducto(0, 10).margen).toBe(0);
  });
});

const stock: FilaStock[] = [
  { variante: 'bolso', bodega: 'principal', cantidad: 28 },
  { variante: 'bolso', bodega: 'local', cantidad: 14 },
  { variante: 'cam-negro-m', bodega: 'local', cantidad: 3 },
  { variante: 'cam-negro-s', bodega: 'principal', cantidad: 2 },
];

describe('C2 · stock por bodega', () => {
  it('stock de una variante = suma de sus bodegas (o de una sola)', () => {
    expect(stockDeVariante('bolso', stock)).toBe(42);
    expect(stockDeVariante('bolso', stock, 'local')).toBe(14);
    expect(stockDeVariante('nada', stock)).toBe(0);
  });
  it('stock de un producto = suma de sus variantes', () => {
    expect(stockDeProducto(['cam-negro-m', 'cam-negro-s'], stock)).toBe(5);
    expect(stockDeProducto(['cam-negro-m', 'cam-negro-s'], stock, 'principal')).toBe(2);
  });
  it('una salida mayor a lo que hay en esa bodega se rechaza (nunca negativo)', () => {
    expect(validarSalida(5, 3)).toEqual({ codigo: 'stockInsuficiente', disponible: 3 });
    expect(validarSalida(3, 3)).toBeNull();
    expect(validarSalida(0, 3)).toEqual({ codigo: 'cantidadInvalida', disponible: 3 });
  });
});

describe('C5 · valor del inventario y por reponer', () => {
  const productos = [
    { id: 'bolso', precio: 120_000, costo: 50_000, minimo: 0, variantes: ['bolso'] },
    { id: 'cam', precio: 45_000, costo: 18_000, minimo: 10, variantes: ['cam-negro-m', 'cam-negro-s'] },
  ];
  it('a costo, a precio y ganancia potencial (total y por bodega)', () => {
    expect(valorInventario(productos, stock)).toEqual({ unidades: 47, aCosto: 42 * 50_000 + 5 * 18_000, aPrecio: 42 * 120_000 + 5 * 45_000, ganancia: 42 * 70_000 + 5 * 27_000 });
    expect(valorInventario(productos, stock, 'local').unidades).toBe(17);
  });
  it('por reponer si el stock total es menor al mínimo', () => {
    expect(porReponer(productos[1], stock)).toBe(true);
    expect(porReponer(productos[0], stock)).toBe(false);
  });
});

describe('C6 · códigos de barras', () => {
  it('dígito de control EAN-13', () => {
    expect(digitoControlEan13('750103131130')).toBe(9); // 7501031311309
    expect(digitoControlEan13('290000000001')).toBe(digitoControlEan13('290000000001'));
    expect(esEan13Valido('7501031311309')).toBe(true);
    expect(esEan13Valido('7501031311308')).toBe(false);
  });
  it('los internos empiezan por 29, tienen 13 dígitos y control válido', () => {
    const c = codigoInterno(() => 0.123456789);
    expect(c).toMatch(/^29\d{11}$/);
    expect(esEan13Valido(c)).toBe(true);
  });
});

describe('C7 · variantes', () => {
  it('colores × tallas, "Color / Talla"', () => {
    expect(armarVariantes(['S', 'M'], ['Negro', 'Blanco']).map((v) => v.nombre)).toEqual(['Negro / S', 'Negro / M', 'Blanco / S', 'Blanco / M']);
  });
  it('una sola dimensión usa esa; sin ninguna, "Única"', () => {
    expect(armarVariantes(['S'], []).map((v) => v.nombre)).toEqual(['S']);
    expect(armarVariantes([], ['Rojo']).map((v) => v.nombre)).toEqual(['Rojo']);
    expect(armarVariantes([], [])).toEqual([{ color: null, talla: null, nombre: 'Única' }]);
  });
});

describe('validar un producto nuevo', () => {
  const base = { nombre: 'Camiseta', precio: 45_000, codigos: ['290000000001', ''] };
  it('nombre y precio obligatorios', () => {
    expect(validarProducto({ ...base, nombre: ' ' })).toEqual({ codigo: 'productoSinNombre' });
    expect(validarProducto({ ...base, precio: 0 })).toEqual({ codigo: 'productoSinPrecio' });
    expect(validarProducto(base)).toBeNull();
  });
  it('no deja códigos repetidos, ni entre sus variantes ni con otro producto', () => {
    expect(validarProducto({ ...base, codigos: ['123', '123'] })).toEqual({ codigo: 'codigoRepetido', valor: '123' });
    expect(validarProducto(base, new Map([['290000000001', 'Bolso tejido']]))).toEqual({ codigo: 'codigoDeOtro', valor: '290000000001', producto: 'Bolso tejido' });
  });
});
