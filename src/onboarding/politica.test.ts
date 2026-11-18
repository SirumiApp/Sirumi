import { describe, expect, it } from '@jest/globals';

import { politicas } from './politica';

describe('políticas', () => {
  it('la versión en inglés tiene las mismas secciones que la española', () => {
    for (const cual of ['colombia', 'internacional'] as const) {
      expect(politicas('en')[cual].map((f) => f.tipo)).toEqual(politicas('es')[cual].map((f) => f.tipo));
    }
  });
  it('un idioma sin traducción usa el español', () => {
    expect(politicas('pt')).toBe(politicas('es'));
  });
});
