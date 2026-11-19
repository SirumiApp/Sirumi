import { describe, expect, it } from '@jest/globals';

import {
  ajusteSaldoInicial,
  etiquetaMes,
  leerExtracto,
  leerFecha,
  leerValor,
  marcarDuplicados,
  sugerirCategoria,
  sugerirTipo,
} from './extractos';

describe('leer valores', () => {
  it('formatos colombianos, con signo, paréntesis y decimales', () => {
    expect(leerValor('$ 1.250.000')).toBe(1_250_000);
    expect(leerValor('1.250.000,00')).toBe(1_250_000);
    expect(leerValor('-1,250,000.50')).toBe(-1_250_001);
    expect(leerValor('(45.000)')).toBe(-45_000);
    expect(leerValor('45.000-')).toBe(-45_000);
    expect(leerValor(-2300.4)).toBe(-2_300);
    expect(leerValor('1.5')).toBe(2);
    expect(leerValor('')).toBeNull();
    expect(leerValor('abc')).toBeNull();
  });
});

describe('leer fechas', () => {
  it('día/mes/año, ISO, año corto, compacta, con mes en letras y la fecha de Excel', () => {
    expect(leerFecha('15/08/2026')).toBe('2026-08-15');
    expect(leerFecha('2026-08-15')).toBe('2026-08-15');
    expect(leerFecha('15-08-26')).toBe('2026-08-15');
    expect(leerFecha('20260815')).toBe('2026-08-15');
    expect(leerFecha('15 ago 2026')).toBe('2026-08-15');
    expect(leerFecha('3 de septiembre de 2026')).toBe('2026-09-03');
    expect(leerFecha(46249)).toBe('2026-08-15');
    expect(leerFecha('2026/8/5')).toBe('2026-08-05');
    expect(leerFecha('31/02/2026')).toBeNull();
    expect(leerFecha('hola')).toBeNull();
  });
});

describe('B9 · leer el extracto', () => {
  it('salta el encabezado del banco, encuentra los títulos y lee valor con signo (ignora el saldo)', () => {
    const filas = [
      ['BANCOLOMBIA'],
      ['Cuenta de ahorros 123-456789-00'],
      ['FECHA', 'DESCRIPCIÓN', 'SUCURSAL', 'DCTO.', 'VALOR', 'SALDO'],
      ['15/08/2026', 'PAGO PSE EPM', '', '', '-120.000,00', '880.000'],
      ['16/08/2026', 'TRANSFERENCIA DE CLIENTE', '', '', '350.000,00', '1.230.000'],
      ['', 'Total', '', '', '', ''],
    ];
    const r = leerExtracto(filas);
    expect(r.columnas).toMatchObject({ fecha: 0, descripcion: 1, valor: 4 });
    expect(r.movimientos).toEqual([
      { fila: 4, fecha: '2026-08-15', descripcion: 'PAGO PSE EPM', monto: -120_000 },
      { fila: 5, fecha: '2026-08-16', descripcion: 'TRANSFERENCIA DE CLIENTE', monto: 350_000 },
    ]);
    expect(r.sinLeer).toBe(0);
  });
  it('columnas de débito y crédito separadas', () => {
    const r = leerExtracto([
      ['Fecha', 'Concepto', 'Débito', 'Crédito', 'Saldo'],
      ['2026-08-01', 'Arriendo local', '1.300.000', '', '0'],
      ['2026-08-02', 'Venta Nequi', '', '85.000', '0'],
    ]);
    expect(r.movimientos.map((m) => m.monto)).toEqual([-1_300_000, 85_000]);
  });
  it('sin títulos reconocibles devuelve columnas nulas; con columnas escogidas por la persona sí lee', () => {
    const filas = [
      ['a', 'b', 'c'],
      ['01/08/2026', 'Algo', '-5.000'],
    ];
    expect(leerExtracto(filas).columnas).toBeNull();
    expect(leerExtracto(filas, { fila: 0, fecha: 0, descripcion: 1, valor: 2, debito: null, credito: null }).movimientos).toEqual([
      { fila: 2, fecha: '2026-08-01', descripcion: 'Algo', monto: -5_000 },
    ]);
  });
});

describe('B9 · duplicados', () => {
  it('misma fecha, mismo valor y misma dirección; cada existente tapa solo a uno', () => {
    const nuevos = [
      { fila: 1, fecha: '2026-08-15', descripcion: 'a', monto: -120_000 },
      { fila: 2, fecha: '2026-08-15', descripcion: 'b', monto: -120_000 },
      { fila: 3, fecha: '2026-08-15', descripcion: 'c', monto: 120_000 },
    ];
    expect(marcarDuplicados(nuevos, [{ fecha: '2026-08-15', monto: -120_000 }])).toEqual([true, false, false]);
  });
});

describe('B9 · saldo de hoy no cambia', () => {
  it('ejemplo: entrada 2.350.000 y salida 1.300.000 → el saldo inicial baja 1.050.000', () => {
    expect(ajusteSaldoInicial([2_350_000, -1_300_000])).toBe(-1_050_000);
  });
});

describe('B9 · sugerencias', () => {
  it('negocio: venta, préstamo, gasto fijo, impuesto, compra o gasto variable', () => {
    expect(sugerirTipo('Transferencia de cliente', 1)).toBe('venta');
    expect(sugerirTipo('DESEMBOLSO CREDITO', 1)).toBe('prestamo');
    expect(sugerirTipo('PAGO ARRIENDO LOCAL', -1)).toBe('fijo');
    expect(sugerirTipo('Pago PSE Claro internet', -1)).toBe('fijo');
    expect(sugerirTipo('GMF 4X1000', -1)).toBe('impuesto');
    expect(sugerirTipo('Pago a proveedor telas', -1)).toBe('compra');
    expect(sugerirTipo('COMPRA EN MERCADOLIBRE', -1)).toBe('variable');
  });
  it('personal: categoría por el comercio (sin tildes ni mayúsculas)', () => {
    expect(sugerirCategoria('COMPRA EN ÉXITO CALLE 80', -1)).toBe('mercado');
    expect(sugerirCategoria('RAPPI*RESTAURANTE', -1)).toBe('comida');
    expect(sugerirCategoria('UBER TRIP', -1)).toBe('transporte');
    expect(sugerirCategoria('NETFLIX.COM', -1)).toBe('salidas');
    expect(sugerirCategoria('Veterinaria Dog', -1)).toBe('mascotas');
    expect(sugerirCategoria('ABONO NOMINA', 1)).toBe('ingreso');
    expect(sugerirCategoria('ALGO RARO', -1)).toBeNull();
  });
});

describe('etiqueta del extracto', () => {
  it('el mes que más aparece', () => {
    expect(etiquetaMes(['2026-08-01', '2026-08-30', '2026-09-01'])).toBe('2026-08');
  });
});
