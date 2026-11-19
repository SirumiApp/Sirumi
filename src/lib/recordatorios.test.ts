import { describe, expect, it } from '@jest/globals';

import type { Recurrente } from './contactos';
import type { MovNegocio } from './negocio';
import { recordatoriosDeRecurrentes } from './recordatorios';

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
