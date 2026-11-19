import { describe, expect, it } from '@jest/globals';

import { politicas } from './politica';

describe('políticas', () => {
  it('la versión en inglés tiene las mismas secciones que la española', () => {
    for (const cual of ['colombia', 'internacional', 'terminos', 'anexo'] as const) {
      expect(politicas('en')[cual].map((f) => f.tipo)).toEqual(politicas('es')[cual].map((f) => f.tipo));
    }
  });
  it('los términos tienen sus 14 secciones y el anexo sus 8', () => {
    expect(politicas('es').terminos.filter((f) => f.tipo === 'h')).toHaveLength(14);
    expect(politicas('es').anexo.filter((f) => f.tipo === 'h')).toHaveLength(8);
  });
  it('un idioma sin traducción usa el español', () => {
    expect(politicas('pt')).toBe(politicas('es'));
  });
});
