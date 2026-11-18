import { describe, expect, it, jest } from '@jest/globals';

import { idiomaDelCelular } from './index';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'es' }] }));

describe('idiomaDelCelular', () => {
  it('usa el idioma del celular si la app lo tiene', () => {
    expect(idiomaDelCelular(['en'])).toBe('en');
    expect(idiomaDelCelular(['fr', 'en'])).toBe('en');
  });
  it('si no lo tiene, español', () => {
    expect(idiomaDelCelular(['pt'])).toBe('es');
    expect(idiomaDelCelular([])).toBe('es');
  });
});
