import { describe, expect, it } from '@jest/globals';

import { esOscuro } from './apariencia';

describe('apariencia', () => {
  it('"Sistema" sigue el modo del teléfono', () => {
    expect(esOscuro('sistema', 'dark')).toBe(true);
    expect(esOscuro('sistema', 'light')).toBe(false);
    expect(esOscuro('sistema', null)).toBe(false);
  });
  it('"Claro" y "Oscuro" mandan sin importar el teléfono', () => {
    expect(esOscuro('oscuro', 'light')).toBe(true);
    expect(esOscuro('claro', 'dark')).toBe(false);
  });
});
