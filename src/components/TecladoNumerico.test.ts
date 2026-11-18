import { describe, expect, it, jest } from '@jest/globals';

import { aplicarTecla } from './TecladoNumerico';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('teclado numérico', () => {
  it('escribe dígitos y el botón 000', () => {
    expect(aplicarTecla('25', '000')).toBe('25000');
    expect(aplicarTecla('', '5')).toBe('5');
  });
  it('no empieza con ceros', () => {
    expect(aplicarTecla('', '0')).toBe('');
    expect(aplicarTecla('', '000')).toBe('');
  });
  it('borra el último dígito', () => {
    expect(aplicarTecla('250', 'borrar')).toBe('25');
    expect(aplicarTecla('', 'borrar')).toBe('');
  });
  it('máximo 10 dígitos', () => {
    expect(aplicarTecla('999999999', '000')).toBe('9999999990');
  });
});
