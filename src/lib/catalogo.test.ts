import { describe, expect, it } from '@jest/globals';

import { catalogoACsv, leerCatalogo, separarCsv } from './catalogo';

describe('leer CSV', () => {
  it('coma o punto y coma, comillas y saltos de línea dentro de comillas', () => {
    expect(separarCsv('a;b;c\r\n1;"dos; tres";4')).toEqual([['a', 'b', 'c'], ['1', 'dos; tres', '4']]);
    expect(separarCsv('a,b\n"x ""y""",z\n')).toEqual([['a', 'b'], ['x "y"', 'z']]);
  });
});

describe('C8 · importar el catálogo', () => {
  it('ejemplo del documento: dos filas con el mismo nombre son variantes del mismo producto', () => {
    const csv = 'Nombre;Colección;Precio;Costo;Talla;Color;Código;Cantidad\nCamiseta;Verano;45.000;18.000;S;Negro;;5\ncamiseta ;;;;M;Negro;;3';
    const r = leerCatalogo(csv, []);
    expect(r.errores).toEqual([]);
    expect(r.productos).toEqual([
      {
        nombre: 'Camiseta',
        coleccion: 'Verano',
        precio: 45_000,
        costo: 18_000,
        minimo: 0,
        variantes: [
          { talla: 'S', color: 'Negro', codigo: '', cantidad: 5 },
          { talla: 'M', color: 'Negro', codigo: '', cantidad: 3 },
        ],
      },
    ]);
  });
  it('títulos en inglés y montos con signo de pesos', () => {
    const r = leerCatalogo('name,price,cost,size,quantity\nMug,"$ 28.000",11000,,4', []);
    expect(r.productos[0]).toMatchObject({ nombre: 'Mug', precio: 28_000, costo: 11_000, variantes: [{ talla: null, color: null, cantidad: 4 }] });
  });
  it('marca errores por fila sin dañar el resto, y omite los que ya existen', () => {
    const csv = 'nombre;precio;cantidad\n;1000;1\nSin precio;;2\nBolso;120000;3\nTaza;28000;x';
    const r = leerCatalogo(csv, ['bolso']);
    expect(r.productos).toEqual([]);
    expect(r.errores).toEqual([
      { fila: 2, codigo: 'catalogoSinNombre' },
      { fila: 3, codigo: 'catalogoSinPrecio', nombre: 'Sin precio' },
      { fila: 5, codigo: 'catalogoCantidad', nombre: 'Taza' },
    ]);
    expect(r.omitidos).toEqual(['Bolso']);
  });
  it('códigos repetidos (C6) y archivo sin la columna nombre', () => {
    expect(leerCatalogo('nombre;precio;codigo\nA;1;123\nB;1;123', []).errores).toEqual([{ fila: 3, codigo: 'catalogoCodigoRepetido', nombre: 'B', valor: '123' }]);
    expect(leerCatalogo('precio\n1', []).errores).toEqual([{ fila: 1, codigo: 'catalogoSinColumnas' }]);
  });
});

describe('C8 · exportar', () => {
  it('lo exportado se vuelve a importar igual', () => {
    const productos = [{ nombre: 'Camiseta', coleccion: 'Verano', precio: 45_000, costo: 18_000, minimo: 10, variantes: [{ talla: 'S', color: 'Negro', codigo: '2900000000015', cantidad: 5 }] }];
    const csv = catalogoACsv(productos);
    expect(csv.split('\r\n')[0]).toBe('nombre;coleccion;precio;costo;talla;color;codigo;cantidad;minimo');
    expect(leerCatalogo(csv, []).productos).toEqual(productos);
  });
});

describe('C8 · exportar seguro', () => {
  it('no deja fórmulas de Excel y pone entre comillas lo que trae punto y coma', () => {
    const csv = catalogoACsv([{ nombre: '=HACK()', coleccion: 'Uno; dos', precio: 1, costo: 0, minimo: 0, variantes: [{ talla: null, color: null, codigo: '', cantidad: 0 }] }]);
    expect(csv.split('\r\n')[1]).toBe(`'=HACK();"Uno; dos";1;0;;;;0;0`);
  });
});
