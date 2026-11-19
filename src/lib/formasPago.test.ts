import { describe, expect, it } from '@jest/globals';

import { formasDePago } from './formasPago';

describe('D3 · formas de pago', () => {
  it('efectivo, cada cuenta o billetera, datáfono a la principal, las propias y fiado', () => {
    const f = formasDePago(
      [
        { id: 'efe', nombre: 'Efectivo', tipo: 'efectivo', principal: true },
        { id: 'davi', nombre: 'Davivienda', tipo: 'banco', principal: false },
        { id: 'nequi', nombre: 'Nequi', tipo: 'billetera', principal: false },
      ],
      [{ id: 'bold', nombre: 'Datáfono Bold', cuenta: 'davi' }],
    );
    expect(f.map((x) => [x.clave, x.cuenta])).toEqual([
      ['efectivo', 'efe'],
      ['cuenta-davi', 'davi'],
      ['cuenta-nequi', 'nequi'],
      ['datafono', 'efe'],
      ['propia-bold', 'davi'],
      ['fiado', null],
    ]);
  });
});
