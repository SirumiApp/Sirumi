import { describe, expect, it } from '@jest/globals';

import { estadisticasContacto, estadoRecurrente, resumenRecurrentes, validarContacto, validarRecurrente, type Recurrente } from './contactos';
import type { MovNegocio } from './negocio';

let n = 0;
const mov = (m: Partial<MovNegocio> & Pick<MovNegocio, 'tipo' | 'monto'>): MovNegocio => ({ id: `c${n++}`, fecha: '2026-11-10', pagado: true, cuenta: 'davi', tarjeta: null, ...m });
const rec = (id: string, dia: number, monto = 100): Recurrente => ({ id, nombre: id, tipo: 'fijo', monto, dia, activo: true });

describe('B10 · pagos recurrentes', () => {
  const hoy = '2026-11-18';
  it('ejemplo del documento: vencido, vence hoy, próximo y más adelante', () => {
    expect(estadoRecurrente(rec('arriendo', 5), [], hoy)).toEqual({ estado: 'vencido', fecha: '2026-11-05', dias: -13 });
    expect(estadoRecurrente(rec('nomina', 18), [], hoy)).toEqual({ estado: 'hoy', fecha: '2026-11-18', dias: 0 });
    expect(estadoRecurrente(rec('internet', 20), [], hoy)).toEqual({ estado: 'proximo', fecha: '2026-11-20', dias: 2 });
    expect(estadoRecurrente(rec('contador', 30), [], hoy)).toEqual({ estado: 'despues', fecha: '2026-11-30', dias: 12 });
  });
  it('pagado si hay un movimiento de este mes enlazado al pago (no cuenta el del mes pasado)', () => {
    const r = rec('arriendo', 5);
    expect(estadoRecurrente(r, [mov({ tipo: 'fijo', monto: 100, recurrente: 'arriendo', fecha: '2026-10-05' })], hoy).estado).toBe('vencido');
    expect(estadoRecurrente(r, [mov({ tipo: 'fijo', monto: 100, recurrente: 'arriendo', fecha: '2026-11-07' })], hoy).estado).toBe('pagado');
  });
  it('el día 31 en febrero vence el último día del mes', () => {
    expect(estadoRecurrente(rec('x', 31), [], '2027-02-10').fecha).toBe('2027-02-28');
    expect(estadoRecurrente(rec('x', 31), [], '2028-02-10').fecha).toBe('2028-02-29');
  });
  it('resumen: cuántos faltan, por cuánto, y el total mensual (solo activos)', () => {
    const lista = [rec('a', 5, 1_300_000), rec('b', 18, 1_500_000), { ...rec('c', 20, 99), activo: false }];
    const r = resumenRecurrentes(lista, [mov({ tipo: 'fijo', monto: 1_300_000, recurrente: 'a', fecha: '2026-11-05' })], hoy);
    expect(r).toEqual({ faltan: 1, montoFaltante: 1_500_000, totalMensual: 2_800_000, urgentes: 1 });
  });
  it('validar: nombre, monto y día entre 1 y 31', () => {
    expect(validarRecurrente({ nombre: ' ', monto: 5, dia: 1 })).toBe('recurrenteSinNombre');
    expect(validarRecurrente({ nombre: 'Arriendo', monto: 0, dia: 1 })).toBe('recurrenteSinMonto');
    expect(validarRecurrente({ nombre: 'Arriendo', monto: 5, dia: 32 })).toBe('recurrenteDia');
    expect(validarRecurrente({ nombre: 'Arriendo', monto: 5, dia: 31 })).toBeNull();
  });
});

describe('B11 · clientes y proveedores', () => {
  it('ejemplo del documento: 2 movimientos, total 800.000 y te debe 300.000', () => {
    const movs = [mov({ tipo: 'venta', monto: 500_000, contacto: 'ana' }), mov({ tipo: 'venta', monto: 300_000, pagado: false, cuenta: null, contacto: 'ana' }), mov({ tipo: 'venta', monto: 9, contacto: 'otro' })];
    expect(estadisticasContacto('ana', movs)).toEqual({ movimientos: 2, total: 800_000, pendiente: 300_000 });
  });
  it('exige nombre y autorización; el correo, si está, debe ser válido', () => {
    const base = { nombre: 'Tienda Aurora', autoriza: true, correo: '' };
    expect(validarContacto({ ...base, nombre: '  ' })).toBe('contactoSinNombre');
    expect(validarContacto({ ...base, autoriza: false })).toBe('contactoSinAutorizacion');
    expect(validarContacto({ ...base, correo: 'compras@' })).toBe('correoInvalido');
    expect(validarContacto({ ...base, correo: 'compras@aurora.co' })).toBeNull();
    expect(validarContacto(base)).toBeNull();
  });
});
