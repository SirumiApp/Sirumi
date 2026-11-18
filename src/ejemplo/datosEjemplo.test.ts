import { describe, expect, it } from '@jest/globals';

import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { periodoPredefinido } from '@/lib/fechas';
import { flujoDelPeriodo } from '@/lib/informes';
import { cajaTotal, estadoDeResultados, estadoTarjeta, saldoCuenta } from '@/lib/negocio';
import { totalesDelPeriodo } from '@/lib/personal';

import {
  CATEGORIAS_EJEMPLO,
  CUENTAS_EJEMPLO,
  movimientosNegocioEjemplo,
  movimientosPersonalesEjemplo,
  NEGOCIO_EJEMPLO,
  PLAN_EJEMPLO,
  planPersonalEjemplo,
  TARJETAS_EJEMPLO,
  TOPES_EJEMPLO,
  trasladosEjemplo,
} from './datosEjemplo';

const HOY = '2026-11-18';
const cuentas = CUENTAS_EJEMPLO.map((c) => ({ id: c.id, saldoInicial: c.saldoInicial }));

describe('datos de ejemplo', () => {
  it('nunca tienen fechas después de hoy, ni siquiera el día 1 del mes', () => {
    for (const hoy of [HOY, '2026-12-01', '2027-03-31']) {
      const fechas = [...movimientosPersonalesEjemplo(hoy), ...movimientosNegocioEjemplo(hoy), ...trasladosEjemplo(hoy)].map((m) => m.fecha);
      expect(fechas.every((f) => f <= hoy)).toBe(true);
    }
  });

  it('personal: el mes tiene ingresos y gastos, usa categorías que existen y supera un tope', () => {
    const movs = movimientosPersonalesEjemplo(HOY);
    const ids = new Set(CATEGORIAS_EJEMPLO.map((c) => c.id));
    expect(movs.every((m) => ids.has(m.categoria))).toBe(true);
    expect(Object.keys(TOPES_EJEMPLO).every((id) => ids.has(id))).toBe(true);
    const mes = totalesDelPeriodo(movs, periodoPredefinido('mes', HOY));
    expect(mes.ingreso).toBeGreaterThan(mes.gasto);
    expect(mes.gastoPorCategoria['ej-salidas']).toBeGreaterThan(TOPES_EJEMPLO['ej-salidas']);
    expect(new Set(movs.map((m) => m.fecha.slice(0, 7))).size).toBe(6);
  });

  it('personal: metas sin pasarse del objetivo y patrimonio que sube', () => {
    const plan = planPersonalEjemplo(HOY);
    expect(plan.metas.every((m) => m.ahorrado <= m.objetivo)).toBe(true);
    expect(plan.fotos.at(-1)!.mes).toBe('2026-11');
    expect(plan.fotos.at(-1)!.neto).toBeGreaterThan(plan.fotos[0].neto);
  });

  it('negocio: un mes completo gana plata, la caja es positiva y el flujo cierra con la caja (B6)', () => {
    const movs = movimientosNegocioEjemplo(HOY);
    const tras = trasladosEjemplo(HOY);
    const octubre = movs.filter((m) => m.fecha.startsWith('2026-10'));
    const r = estadoDeResultados(octubre, { costoPorcentaje: NEGOCIO_EJEMPLO.configuracion.costo_porcentaje });
    expect(r.ventas).toBe(10_600_000);
    expect(r.operativa).toBeGreaterThan(0);
    expect(cajaTotal(cuentas, movs, tras)).toBeGreaterThan(0);
    expect(flujoDelPeriodo(periodoPredefinido('mes', HOY), cuentas, movs, tras).cierre).toBe(cajaTotal(cuentas, movs, tras));
    expect(movs.some((m) => !m.pagado && m.tipo === 'venta')).toBe(true);
    expect(estadoTarjeta({ ...TARJETAS_EJEMPLO[0] }, movs, tras).alerta).toBe('ok');
  });

  it('cada texto de ejemplo tiene traducción en español e inglés', () => {
    const claves = new Set<string>();
    const agregar = (s: string | null | undefined) => s?.startsWith('ejemplo.textos.') && claves.add(s.replace('ejemplo.textos.', ''));
    movimientosPersonalesEjemplo(HOY).forEach((m) => agregar(m.descripcion));
    movimientosNegocioEjemplo(HOY).forEach((m) => agregar(m.concepto));
    trasladosEjemplo(HOY).forEach((t) => agregar(t.nota));
    const plan = planPersonalEjemplo(HOY);
    [...plan.metas, ...plan.deudas, ...plan.activos].forEach((x) => agregar(x.nombre));
    [NEGOCIO_EJEMPLO.nombre, PLAN_EJEMPLO.meta, ...CUENTAS_EJEMPLO.map((c) => c.nombre)].forEach(agregar);
    for (const c of claves) {
      expect(es.ejemplo.textos).toHaveProperty(c);
      expect(en.ejemplo.textos).toHaveProperty(c);
    }
  });
});

describe('cuentas de ejemplo', () => {
  it('ninguna cuenta queda en negativo, en ningún día del mes', () => {
    for (const hoy of ['2026-11-01', '2026-11-18', '2026-11-30', '2027-02-27']) {
      const movs = movimientosNegocioEjemplo(hoy);
      const tras = trasladosEjemplo(hoy);
      for (const c of cuentas) expect(saldoCuenta(c, movs, tras)).toBeGreaterThanOrEqual(0);
    }
  });
});
