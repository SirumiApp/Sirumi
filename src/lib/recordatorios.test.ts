import { describe, expect, it } from '@jest/globals';

import type { Recurrente } from './contactos';
import type { MovNegocio } from './negocio';
import { recordatoriosDeExtractos, recordatoriosDeImpuestos, recordatoriosDeRecurrentes } from './recordatorios';

const rec = (id: string, dia: number, activo = true): Recurrente => ({ id, nombre: id, tipo: 'fijo', monto: 100, dia, activo });
const pago = (recurrente: string, fecha: string): MovNegocio => ({ id: `m-${recurrente}`, fecha, tipo: 'fijo', monto: 100, pagado: true, cuenta: 'c', tarjeta: null, recurrente });

describe('recordatorios de pagos recurrentes', () => {
  it('avisa el día que vence, en los próximos días; lo de este mes ya pagado no se recuerda', () => {
    const r = recordatoriosDeRecurrentes([rec('arriendo', 5), rec('internet', 20), rec('pausado', 25, false)], [pago('arriendo', '2026-11-05')], '2026-11-18');
    expect(r.map((x) => x.clave)).toEqual(['recurrente-internet-2026-11-20', 'recurrente-arriendo-2026-12-05', 'recurrente-internet-2026-12-20']);
  });
  it('un vencido sin pagar no se programa (ya pasó); el día 31 en febrero va el 28', () => {
    const r = recordatoriosDeRecurrentes([rec('contador', 31)], [], '2027-02-10', 30);
    expect(r.map((x) => x.fecha)).toEqual(['2027-02-28']);
    expect(recordatoriosDeRecurrentes([rec('arriendo', 5)], [], '2026-11-18', 10)).toEqual([]);
  });
});

describe('avisos de impuestos y extractos', () => {
  it('B12: tres días antes y el mismo día; si solo hay mes, el día 1', () => {
    const r = recordatoriosDeImpuestos(
      [
        { obligacion: 'anticipoSimple', mes: '2026-11', fecha: '2026-11-25', periodo: { desde: '2026-09', hasta: '2026-10' } },
        { obligacion: 'declaracionSimple', mes: '2027-04', fecha: null, periodo: { desde: '2026-01', hasta: '2026-12' } },
      ],
      '2026-11-23',
    );
    expect(r.map((x) => [x.fecha, x.cuando])).toEqual([
      ['2026-11-25', 'hoy'],
      ['2027-04-01', 'mes'],
    ]);
  });
  it('B9: el 5 de cada mes, por el mes que cerró', () => {
    expect(recordatoriosDeExtractos('2026-11-19')).toEqual([
      { clave: 'extracto-2026-11', fecha: '2026-12-05', mes: '2026-11' },
      { clave: 'extracto-2026-12', fecha: '2027-01-05', mes: '2026-12' },
    ]);
    expect(recordatoriosDeExtractos('2026-11-03', 1)).toEqual([{ clave: 'extracto-2026-10', fecha: '2026-11-05', mes: '2026-10' }]);
  });
});
