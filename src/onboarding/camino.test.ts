// Orden de los pasos del onboarding (docs/specs/01-onboarding.md).
import { describe, expect, it } from '@jest/globals';

import { caminoDePasos, pasoAnterior, pasoSiguiente } from './camino';

describe('camino de pasos', () => {
  it('personal con plan: los 7 pasos', () => {
    expect(caminoDePasos('personal', 'ahorro')).toEqual(['pais', 'datos', 'uso', 'objetivo', 'plan', 'privacidad', 'listo']);
    expect(caminoDePasos('ambos', 'meta')).toEqual(['pais', 'datos', 'uso', 'objetivo', 'plan', 'privacidad', 'listo']);
  });
  it('"Solo ver en qué gasto" se salta el plan', () => {
    expect(caminoDePasos('personal', 'ver')).toEqual(['pais', 'datos', 'uso', 'objetivo', 'privacidad', 'listo']);
  });
  it('solo negocio se salta objetivo y plan', () => {
    expect(caminoDePasos('negocio', 'ahorro')).toEqual(['pais', 'datos', 'uso', 'privacidad', 'listo']);
  });
  it('avanza y retrocede según el camino', () => {
    expect(pasoSiguiente('uso', 'negocio', 'ahorro')).toBe('privacidad');
    expect(pasoAnterior('privacidad', 'negocio', 'ahorro')).toBe('uso');
    expect(pasoAnterior('privacidad', 'personal', 'ver')).toBe('objetivo');
    expect(pasoAnterior('privacidad', 'personal', 'deudas')).toBe('plan');
    expect(pasoAnterior('pais', 'personal', 'ver')).toBe('pais');
    expect(pasoSiguiente('listo', 'personal', 'ver')).toBe('listo');
  });
});
