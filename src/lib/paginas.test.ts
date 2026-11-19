import { describe, expect, it } from '@jest/globals';

import { todasLasFilas } from './paginas';

describe('pedir todo por páginas (el servidor da máximo 1.000 filas)', () => {
  const datos = Array.from({ length: 2_345 }, (_, i) => i);
  const pedir = (desde: number, hasta: number) => Promise.resolve({ data: datos.slice(desde, hasta + 1), error: null });
  it('trae las 2.345 filas en 3 páginas', async () => {
    const r = await todasLasFilas(pedir);
    expect(r.data).toHaveLength(2_345);
    expect(r.data.at(-1)).toBe(2_344);
  });
  it('con justo 1.000 filas pide una página más (vacía) y termina', async () => {
    let llamadas = 0;
    const r = await todasLasFilas((d, h) => {
      llamadas++;
      return Promise.resolve({ data: datos.slice(0, 1000).slice(d, h + 1), error: null });
    });
    expect(r.data).toHaveLength(1000);
    expect(llamadas).toBe(2);
  });
  it('si falla, devuelve el error', async () => {
    const r = await todasLasFilas(() => Promise.resolve({ data: null, error: 'sin conexión' }));
    expect(r.error).toBe('sin conexión');
  });
});
