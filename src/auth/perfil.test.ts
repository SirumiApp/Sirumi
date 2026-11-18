import { describe, expect, it, jest } from '@jest/globals';

import { primerNombre } from './perfil';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('primerNombre', () => {
  it('toma la primera palabra del nombre', () => {
    expect(primerNombre('Nicolás Andrés Niño')).toBe('Nicolás');
    expect(primerNombre('  Ana  ')).toBe('Ana');
  });
  it('devuelve null si no hay nombre', () => {
    expect(primerNombre('')).toBeNull();
    expect(primerNombre(null)).toBeNull();
    expect(primerNombre(undefined)).toBeNull();
  });
});
