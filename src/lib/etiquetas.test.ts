import { describe, expect, it } from '@jest/globals';

import { anchosCode128, htmlEtiquetas, simbolosCode128, svgCode128 } from './etiquetas';

describe('C11 · etiquetas con código de barras', () => {
  it('Code 128-B: inicio, datos, dígito de control y parada', () => {
    // "AB": 104 + 33×1 + 34×2 = 205 → 205 mod 103 = 102.
    expect(simbolosCode128('AB')).toEqual([104, 33, 34, 102, 106]);
  });
  it('cada símbolo mide 11 módulos y la parada 13', () => {
    const anchos = anchosCode128('7701234567890');
    const simbolos = simbolosCode128('7701234567890').length;
    expect(anchos.reduce((s, w) => s + w, 0)).toBe((simbolos - 1) * 11 + 13);
  });
  it('rechaza caracteres que no se pueden codificar', () => {
    expect(() => simbolosCode128('café')).toThrow('caracterInvalido');
  });
  it('arma el SVG y la hoja, escapando los textos', () => {
    expect(svgCode128('123')).toContain('<rect');
    const html = htmlEtiquetas([{ nombre: 'Taza <grande>', detalle: 'Blanco', precio: '$ 28.000', codigo: '123' }], 'Tienda');
    expect(html).toContain('Taza &lt;grande&gt;');
    expect(html).toContain('$ 28.000');
  });
});
