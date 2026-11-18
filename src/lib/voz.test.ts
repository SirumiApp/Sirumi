// Entender un gasto dicho (o escrito) en una frase: monto, gasto o ingreso, categoría y descripción.
import { describe, expect, it } from '@jest/globals';

import { interpretarFrase, montoDeFrase } from './voz';

describe('montoDeFrase', () => {
  it('cifras con "mil", "k" y "millones"', () => {
    expect(montoDeFrase('25 mil almuerzo')).toBe(25_000);
    expect(montoDeFrase('uber 18k')).toBe(18_000);
    expect(montoDeFrase('3 millones')).toBe(3_000_000);
    expect(montoDeFrase('1,5 millones arriendo')).toBe(1_500_000);
  });
  it('cifras con separador de miles (punto o coma)', () => {
    expect(montoDeFrase('Gasté 25.000 en Uber')).toBe(25_000);
    expect(montoDeFrase('$25,000 lunch')).toBe(25_000);
    expect(montoDeFrase('1.250.000 de mercado')).toBe(1_250_000);
  });
  it('números en palabras', () => {
    expect(montoDeFrase('veinticinco mil pesos en el mercado')).toBe(25_000);
    expect(montoDeFrase('dos millones quinientos mil')).toBe(2_500_000);
    expect(montoDeFrase('cien mil croquetas')).toBe(100_000);
    expect(montoDeFrase('two million salary')).toBe(2_000_000);
  });
  it('sin monto devuelve 0', () => {
    expect(montoDeFrase('almuerzo')).toBe(0);
    expect(montoDeFrase('')).toBe(0);
  });
});

describe('interpretarFrase', () => {
  it('"25 mil almuerzo" → gasto de comida', () => {
    expect(interpretarFrase('25 mil almuerzo')).toEqual({ monto: 25_000, tipo: 'gasto', categoria: 'comida', descripcion: 'Almuerzo' });
  });
  it('"Gasté 25.000 en Uber" → transporte', () => {
    expect(interpretarFrase('Gasté 25.000 en Uber')).toEqual({ monto: 25_000, tipo: 'gasto', categoria: 'transporte', descripcion: 'Uber' });
  });
  it('"me pagaron el sueldo 3 millones" → ingreso', () => {
    expect(interpretarFrase('me pagaron el sueldo 3 millones')).toEqual({
      monto: 3_000_000,
      tipo: 'ingreso',
      categoria: 'ingreso',
      descripcion: 'Sueldo',
    });
  });
  it('mercado y mascotas', () => {
    expect(interpretarFrase('veinticinco mil pesos en el mercado')).toMatchObject({ categoria: 'mercado', descripcion: 'Mercado' });
    expect(interpretarFrase('cien mil croquetas para el perro')).toMatchObject({
      monto: 100_000,
      categoria: 'mascotas',
      descripcion: 'Croquetas para el perro',
    });
  });
  it('salidas y shopping', () => {
    expect(interpretarFrase('80 mil cerveza con amigos')).toMatchObject({ categoria: 'salidas' });
    expect(interpretarFrase('compré unos zapatos 150 mil')).toMatchObject({ categoria: 'shopping', descripcion: 'Zapatos' });
  });
  it('en inglés', () => {
    expect(interpretarFrase('$25,000 lunch')).toEqual({ monto: 25_000, tipo: 'gasto', categoria: 'comida', descripcion: 'Lunch' });
    expect(interpretarFrase('salary 2 million')).toMatchObject({ tipo: 'ingreso', categoria: 'ingreso' });
  });
  it('si no reconoce la categoría la deja para que la persona la elija', () => {
    expect(interpretarFrase('1,5 millones arriendo')).toEqual({ monto: 1_500_000, tipo: 'gasto', categoria: null, descripcion: 'Arriendo' });
  });
});
