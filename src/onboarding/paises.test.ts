import { describe, expect, it } from '@jest/globals';

import { es } from '@/i18n/es';

import { formatearMontoPais, PAISES, paisPorCodigo, validarCelular } from './paises';

describe('países', () => {
  it('son los 10 de la especificación, con su moneda', () => {
    expect(PAISES.map((p) => `${p.codigo}-${p.moneda}`)).toEqual([
      'CO-COP', 'US-USD', 'MX-MXN', 'AR-ARS', 'CL-CLP', 'PE-PEN', 'EC-USD', 'PA-USD', 'BR-BRL', 'ES-EUR',
    ]);
  });
  it('Colombia tiene cédula de ciudadanía, cédula de extranjería, pasaporte y PPT', () => {
    expect(paisPorCodigo('CO').documentos.map((d) => es.documentos[d])).toEqual(['Cédula de ciudadanía', 'Cédula de extranjería', 'Pasaporte', 'PPT']);
  });
  it('muestra los montos con el separador de cada país', () => {
    expect(formatearMontoPais(1_250_000, paisPorCodigo('CO'))).toBe('$ 1.250.000');
    expect(formatearMontoPais(1_250_000, paisPorCodigo('US'))).toBe('$ 1,250,000');
    expect(formatearMontoPais(0, paisPorCodigo('CO'))).toBe('$ 0');
  });
});

describe('validarCelular', () => {
  it('pide mínimo 7 dígitos', () => {
    expect(validarCelular('300 123 4567')).toBeNull();
    expect(validarCelular('123456')).toBe('celular');
    expect(validarCelular('')).toBe('celular');
    expect(es.errores.celular).toBe('Escribe un número de celular válido.');
  });
});
