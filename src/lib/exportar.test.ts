import { describe, expect, it } from '@jest/globals';

import { enmascararDocumento, movimientosACsv, validarNombreCategoria } from './exportar';

describe('movimientosACsv', () => {
  it('una fila por movimiento con encabezado; el monto es un número entero sin separadores', () => {
    const csv = movimientosACsv(
      [
        { fecha: '2026-11-15', tipo: 'gasto', categoria: 'Comida fuera', descripcion: 'Almuerzo', monto: 25_000 },
        { fecha: '2026-11-01', tipo: 'ingreso', categoria: 'Ingreso', descripcion: '', monto: 6_200_000 },
      ],
      { fecha: 'fecha', tipo: 'tipo', categoria: 'categoria', descripcion: 'descripcion', monto: 'monto' },
    );
    expect(csv).toBe('fecha,tipo,categoria,descripcion,monto\r\n2026-11-15,gasto,Comida fuera,Almuerzo,25000\r\n2026-11-01,ingreso,Ingreso,,6200000');
  });
  it('pone entre comillas lo que tiene comas, comillas o saltos de línea', () => {
    const csv = movimientosACsv([{ fecha: '2026-11-15', tipo: 'gasto', categoria: 'Mercado', descripcion: 'Pan, leche y "huevos"', monto: 18_500 }], {
      fecha: 'f', tipo: 't', categoria: 'c', descripcion: 'd', monto: 'm',
    });
    expect(csv.split('\r\n')[1]).toBe('2026-11-15,gasto,Mercado,"Pan, leche y ""huevos""",18500');
  });
  it('evita que Excel ejecute fórmulas escondidas en una descripción', () => {
    const csv = movimientosACsv([{ fecha: '2026-11-15', tipo: 'gasto', categoria: 'Otro', descripcion: '=HYPERLINK("x")', monto: 1 }], {
      fecha: 'f', tipo: 't', categoria: 'c', descripcion: 'd', monto: 'm',
    });
    expect(csv.split('\r\n')[1]).toBe('2026-11-15,gasto,Otro,"\'=HYPERLINK(""x"")",1');
  });
});

describe('enmascararDocumento', () => {
  it('muestra solo los últimos 4', () => {
    expect(enmascararDocumento('1020304567')).toBe('••••4567');
    expect(enmascararDocumento('123')).toBe('••••123');
    expect(enmascararDocumento(null)).toBeNull();
  });
});

describe('validarNombreCategoria', () => {
  const existentes = ['Shopping', 'Comida fuera'];
  it('no vacía ni repetida (sin importar mayúsculas o tildes)', () => {
    expect(validarNombreCategoria('  ', existentes)).toBe('categoriaVacia');
    expect(validarNombreCategoria('shopping', existentes)).toBe('categoriaRepetida');
    expect(validarNombreCategoria('Comída Fuera ', existentes)).toBe('categoriaRepetida');
    expect(validarNombreCategoria('Gimnasio', existentes)).toBeNull();
  });
  it('máximo 24 letras', () => {
    expect(validarNombreCategoria('x'.repeat(25), existentes)).toBe('categoriaLarga');
  });
});
