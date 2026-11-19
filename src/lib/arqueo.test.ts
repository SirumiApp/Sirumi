import { describe, expect, it } from '@jest/globals';

import { ajusteDeArqueo, DENOMINACIONES_CO, resultadoArqueo, totalDenominaciones } from './arqueo';

describe('D10 · contar la caja', () => {
  it('suma billete por billete', () => {
    expect(totalDenominaciones({ 50_000: 3, 2_000: 4, 500: 1 })).toBe(158_500);
    expect(totalDenominaciones({ 20_000: -2, 1_000: 1.7 })).toBe(1_000);
    expect(DENOMINACIONES_CO[0]).toBe(100_000);
  });
  it('cuadra, sobra o falta', () => {
    expect(resultadoArqueo(600_000, 600_000)).toEqual({ diferencia: 0, estado: 'cuadra' });
    expect(resultadoArqueo(600_000, 612_000)).toEqual({ diferencia: 12_000, estado: 'sobra' });
    expect(resultadoArqueo(600_000, 580_000)).toEqual({ diferencia: -20_000, estado: 'falta' });
  });
  it('el ajuste: faltante = gasto variable, sobrante = venta', () => {
    expect(ajusteDeArqueo(-20_000)).toEqual({ tipo: 'variable', monto: 20_000 });
    expect(ajusteDeArqueo(12_000)).toEqual({ tipo: 'venta', monto: 12_000 });
    expect(ajusteDeArqueo(0)).toBeNull();
  });
});
