// Reglas de plata del negocio (docs/reglas-de-calculo.md, sección B). Cada ejemplo del documento es una prueba.
import { describe, expect, it } from '@jest/globals';

import {
  TIPOS_NEGOCIO,
  cajaTotal,
  cuentaDeEntrada,
  deCada100,
  deudaTarjeta,
  estadoDeResultados,
  estadoTarjeta,
  flujoDeCaja,
  iconoDeCuenta,
  resumenArranque,
  porCobrarYPagar,
  puntoDeEquilibrio,
  saldoCuenta,
  saludDelNegocio,
  unidadesDeEquilibrio,
  type MovNegocio,
  type Transferencia,
} from './negocio';

let n = 0;
const mov = (m: Partial<MovNegocio> & Pick<MovNegocio, 'tipo' | 'monto'>): MovNegocio => ({
  id: `m${n++}`,
  fecha: '2026-11-10',
  pagado: true,
  cuenta: null,
  tarjeta: null,
  ...m,
});

const DAVIVIENDA = { id: 'davi', saldoInicial: 3_000_000 };
const EFECTIVO = { id: 'efe', saldoInicial: 0 };

describe('B1 · tipos de movimiento', () => {
  it('qué entra, qué sale, qué cuenta en resultados y qué puede quedar pendiente', () => {
    expect(TIPOS_NEGOCIO.venta).toMatchObject({ entra: true, resultados: 'ventas', puedePendiente: true });
    expect(TIPOS_NEGOCIO.compra).toMatchObject({ entra: false, resultados: 'no', puedePendiente: true });
    expect(TIPOS_NEGOCIO.fijo).toMatchObject({ entra: false, resultados: 'fijo', puedePendiente: true });
    expect(TIPOS_NEGOCIO.variable).toMatchObject({ entra: false, resultados: 'variable', puedePendiente: true });
    expect(TIPOS_NEGOCIO.inversion).toMatchObject({ entra: false, resultados: 'no', puedePendiente: true });
    expect(TIPOS_NEGOCIO.aporte).toMatchObject({ entra: true, resultados: 'no', puedePendiente: false });
    expect(TIPOS_NEGOCIO.prestamo).toMatchObject({ entra: true, resultados: 'no', puedePendiente: false });
    expect(TIPOS_NEGOCIO.retiro).toMatchObject({ entra: false, resultados: 'no', puedePendiente: false });
    expect(TIPOS_NEGOCIO.impuesto).toMatchObject({ entra: false, resultados: 'impuestos', puedePendiente: false });
  });
});

describe('B2 · saldo de una cuenta', () => {
  it('ejemplo del documento: 3.000.000 + venta 500.000 − arriendo 1.300.000 − traslado 200.000 = 2.000.000', () => {
    const movs = [
      mov({ tipo: 'venta', monto: 500_000, cuenta: 'davi' }),
      mov({ tipo: 'fijo', monto: 1_300_000, cuenta: 'davi' }),
    ];
    const traslados: Transferencia[] = [{ fecha: '2026-11-12', desde: 'davi', haciaCuenta: 'efe', haciaTarjeta: null, monto: 200_000 }];
    expect(saldoCuenta(DAVIVIENDA, [movs[0]], [])).toBe(3_500_000);
    expect(saldoCuenta(DAVIVIENDA, movs, [])).toBe(2_200_000);
    expect(saldoCuenta(DAVIVIENDA, movs, traslados)).toBe(2_000_000);
    expect(saldoCuenta(EFECTIVO, movs, traslados)).toBe(200_000);
  });
  it('los pendientes no mueven saldos', () => {
    expect(saldoCuenta(DAVIVIENDA, [mov({ tipo: 'venta', monto: 900_000, pagado: false })], [])).toBe(3_000_000);
  });
});

describe('B3 · tarjetas de crédito (ejemplo del documento)', () => {
  const tarjeta = { id: 'visa', cupo: 5_000_000, deudaInicial: 1_200_000 };
  const publicidad = mov({ tipo: 'variable', monto: 300_000, tarjeta: 'visa' });
  const pago: Transferencia = { fecha: '2026-11-20', desde: 'davi', haciaCuenta: null, haciaTarjeta: 'visa', monto: 500_000 };

  it('gasto de 300.000 con la tarjeta: la caja sigue en 3.000.000, deuda 1.500.000, disponible 3.500.000', () => {
    expect(cajaTotal([DAVIVIENDA], [publicidad], [])).toBe(3_000_000);
    expect(deudaTarjeta(tarjeta, [publicidad], [])).toBe(1_500_000);
    expect(estadoTarjeta(tarjeta, [publicidad], [])).toEqual({ deuda: 1_500_000, disponible: 3_500_000, uso: 30, alerta: 'ok' });
  });
  it('el gasto variable del mes sube 300.000 aunque se pagó con tarjeta', () => {
    expect(estadoDeResultados([publicidad], { costoPorcentaje: 45 }).variables).toBe(300_000);
  });
  it('pagar 500.000 desde Davivienda: caja 2.500.000 y deuda 1.000.000; no es un gasto nuevo', () => {
    expect(cajaTotal([DAVIVIENDA], [publicidad], [pago])).toBe(2_500_000);
    expect(deudaTarjeta(tarjeta, [publicidad], [pago])).toBe(1_000_000);
    expect(estadoDeResultados([publicidad], { costoPorcentaje: 45 }).operativa).toBe(-300_000);
  });
  it('avisa desde el 80% del cupo y si se pasa del cupo', () => {
    expect(estadoTarjeta({ id: 'v', cupo: 1_000_000, deudaInicial: 850_000 }, [], []).alerta).toBe('alta');
    expect(estadoTarjeta({ id: 'v', cupo: 1_000_000, deudaInicial: 1_100_000 }, [], [])).toMatchObject({ disponible: -100_000, alerta: 'excedida' });
  });
  it('una venta nunca entra a una tarjeta: se guarda en la cuenta principal', () => {
    expect(cuentaDeEntrada({ cuenta: null, tarjeta: 'visa' }, 'davi')).toEqual({ cuenta: 'davi', tarjeta: null });
    expect(cuentaDeEntrada({ cuenta: 'efe', tarjeta: null }, 'davi')).toEqual({ cuenta: 'efe', tarjeta: null });
  });
});

describe('B4 · caja total', () => {
  it('suma de saldos de todas las cuentas', () => {
    const movs = [mov({ tipo: 'venta', monto: 500_000, cuenta: 'efe' }), mov({ tipo: 'retiro', monto: 100_000, cuenta: 'davi' })];
    expect(cajaTotal([DAVIVIENDA, EFECTIVO], movs, [])).toBe(3_400_000);
  });
});

describe('B5 · estado de resultados (ejemplo del documento, 45% de costo)', () => {
  const movs = [
    mov({ tipo: 'venta', monto: 8_000_000, cuenta: 'davi' }),
    mov({ tipo: 'venta', monto: 2_000_000, pagado: false }), // fiada: igual cuenta como venta
    mov({ tipo: 'fijo', monto: 3_200_000, cuenta: 'davi' }),
    mov({ tipo: 'variable', monto: 1_000_000, cuenta: 'davi' }),
    mov({ tipo: 'compra', monto: 2_500_000, cuenta: 'davi' }), // va al inventario, no al resultado
    mov({ tipo: 'retiro', monto: 800_000, cuenta: 'davi' }), // no es gasto del negocio
    mov({ tipo: 'aporte', monto: 1_000_000, cuenta: 'davi' }),
  ];
  const r = estadoDeResultados(movs, { costoPorcentaje: 45, impuestos: 160_000 });

  it('ventas 10.000.000 → costo 4.500.000 → bruta 5.500.000 → operativa 1.300.000 → neta 1.140.000', () => {
    expect(r).toMatchObject({
      ventas: 10_000_000,
      costoVentas: 4_500_000,
      utilidadBruta: 5_500_000,
      fijos: 3_200_000,
      variables: 1_000_000,
      operativa: 1_300_000,
      impuestos: 160_000,
      neta: 1_140_000,
    });
    expect(r.margenBruto).toBeCloseTo(0.55, 5);
  });
  it('si hay costo real de lo vendido, usa ese y no el porcentaje', () => {
    expect(estadoDeResultados(movs, { costoPorcentaje: 45, costoReal: 4_000_000 }).costoVentas).toBe(4_000_000);
  });
  it('"De cada $100 que vendes": costo 45, fijos 32, variables 10, impuestos 1,6 y te quedan 11,4', () => {
    expect(deCada100(r)).toEqual({ costo: 45, fijos: 32, variables: 10, impuestos: 1.6, queda: 11.4 });
  });
});

describe('B6 · flujo de caja', () => {
  const movs = [
    mov({ fecha: '2026-11-02', tipo: 'venta', monto: 8_000_000, cuenta: 'davi' }),
    mov({ fecha: '2026-11-03', tipo: 'venta', monto: 2_000_000, pagado: false }),
    mov({ fecha: '2026-11-04', tipo: 'compra', monto: 2_500_000, cuenta: 'davi' }),
    mov({ fecha: '2026-11-05', tipo: 'fijo', monto: 3_200_000, cuenta: 'davi' }),
    mov({ fecha: '2026-11-06', tipo: 'variable', monto: 300_000, tarjeta: 'visa' }), // con tarjeta: no baja la caja
    mov({ fecha: '2026-11-07', tipo: 'variable', monto: 700_000, cuenta: 'efe' }),
    mov({ fecha: '2026-11-08', tipo: 'impuesto', monto: 160_000, cuenta: 'davi' }),
    mov({ fecha: '2026-11-09', tipo: 'inversion', monto: 1_000_000, cuenta: 'davi' }),
    mov({ fecha: '2026-11-10', tipo: 'aporte', monto: 2_000_000, cuenta: 'efe' }),
    mov({ fecha: '2026-11-11', tipo: 'prestamo', monto: 1_500_000, cuenta: 'davi' }),
    mov({ fecha: '2026-11-12', tipo: 'retiro', monto: 800_000, cuenta: 'davi' }),
  ];
  const traslados: Transferencia[] = [
    { fecha: '2026-11-15', desde: 'davi', haciaCuenta: null, haciaTarjeta: 'visa', monto: 500_000 },
    { fecha: '2026-11-16', desde: 'davi', haciaCuenta: 'efe', haciaTarjeta: null, monto: 300_000 },
  ];
  const f = flujoDeCaja(movs, traslados, { desde: '2026-11-01', hasta: '2026-11-30' }, 3_000_000);

  it('operación = cobrado − compras − fijos − variables pagados sin tarjeta − impuestos', () => {
    expect(f.operacion).toBe(8_000_000 - 2_500_000 - 3_200_000 - 700_000 - 160_000);
    expect(f.inversion).toBe(-1_000_000);
    expect(f.financiacion).toBe(2_000_000 + 1_500_000 - 800_000 - 500_000);
  });
  it('el saldo al cierre coincide con la caja de B4 cuando el período termina hoy', () => {
    expect(f.cierre).toBe(cajaTotal([DAVIVIENDA, EFECTIVO], movs, traslados));
  });
});

describe('B8 · punto de equilibrio (ejemplo del documento)', () => {
  it('fijos 3.200.000, costo 45%, variables 10% de las ventas → margen 45% → 7.111.111 al mes', () => {
    const r = puntoDeEquilibrio({ fijosMes: 3_200_000, costoPorcentaje: 45, variables: 1_000_000, ventas: 10_000_000 });
    expect(r.margen).toBeCloseTo(0.45, 5);
    expect(Math.round(r.ventasEquilibrio ?? 0)).toBe(7_111_111);
  });
  it('sin ventas usa 1 − % de costo', () => {
    expect(puntoDeEquilibrio({ fijosMes: 1_000_000, costoPorcentaje: 50, variables: 0, ventas: 0 }).ventasEquilibrio).toBe(2_000_000);
  });
  it('con margen ≤ 0 no hay equilibrio (revisa tu precio)', () => {
    expect(puntoDeEquilibrio({ fijosMes: 1_000_000, costoPorcentaje: 90, variables: 200_000, ventas: 1_000_000 }).ventasEquilibrio).toBeNull();
  });
  it('unidades de equilibrio de un producto = techo(equilibrio / precio)', () => {
    expect(unidadesDeEquilibrio(7_111_111, 85_000)).toBe(84);
  });
});

describe('B8b · por cobrar, por pagar y proyección', () => {
  it('ventas pendientes vs. el resto pendiente más deudas del arranque', () => {
    const movs = [
      mov({ tipo: 'venta', monto: 1_000_000, pagado: false }),
      mov({ tipo: 'compra', monto: 400_000, pagado: false }),
      mov({ tipo: 'fijo', monto: 100_000, pagado: false }),
      mov({ tipo: 'venta', monto: 999, cuenta: 'davi' }),
    ];
    expect(porCobrarYPagar(movs, { deudasIniciales: 2_000_000 }, 3_000_000)).toEqual({ porCobrar: 1_000_000, porPagar: 2_500_000, proyeccion: 1_500_000 });
  });
  it('lo que los clientes debían al arrancar también se cobra', () => {
    expect(porCobrarYPagar([], { deudasIniciales: 0, porCobrarInicial: 700_000 }, 100_000)).toEqual({ porCobrar: 700_000, porPagar: 0, proyeccion: 800_000 });
  });
});

describe('B8c · salud del negocio (ejemplo del documento)', () => {
  it('todo bien → 100 "Saludable"', () => {
    expect(
      saludDelNegocio({ neta: 1_140_000, operativa: 1_300_000, caja: 13_440_000, gastosMes: 4_200_000, ventas: 10_000_000, equilibrio: 7_111_111, porCobrar: 1_000_000, retiros: 800_000 }),
    ).toEqual({ puntaje: 100, estado: 'saludable' });
  });
  it('pierde plata, sin caja y sin ventas → "En riesgo"', () => {
    expect(saludDelNegocio({ neta: -500_000, operativa: -400_000, caja: 100_000, gastosMes: 2_000_000, ventas: 0, equilibrio: null, porCobrar: 0, retiros: 0 })).toEqual({
      puntaje: 25,
      estado: 'riesgo',
    });
  });
});

describe('B8d · ícono de una cuenta', () => {
  it('billetera, efectivo o banco según el nombre', () => {
    expect(iconoDeCuenta('Nequi')).toBe('billetera');
    expect(iconoDeCuenta('mi daviplata')).toBe('billetera');
    expect(iconoDeCuenta('Ualá')).toBe('billetera');
    expect(iconoDeCuenta('Mercado Pago')).toBe('billetera');
    expect(iconoDeCuenta('Efectivo')).toBe('efectivo');
    expect(iconoDeCuenta('Davivienda ahorros')).toBe('banco');
    expect(iconoDeCuenta('Bancolombia')).toBe('banco');
  });
});

describe('Arranque: resumen de lo que tienes, lo que debes y patrimonio', () => {
  it('cuentas + lo que te deben + inventario + equipos − proveedores − préstamos − tarjetas', () => {
    expect(
      resumenArranque({
        cuentas: [3_000_000, 500_000, 200_000],
        porCobrar: 1_000_000,
        inventario: 2_000_000,
        equipos: 1_500_000,
        deudaProveedores: 800_000,
        prestamos: 2_000_000,
        tarjetas: [{ cupo: 5_000_000, deuda: 1_200_000 }],
      }),
    ).toEqual({ tienes: 8_200_000, debes: 4_000_000, patrimonio: 4_200_000 });
  });
});
