// B15 · Meta de ventas del mes del negocio. Funciones puras.

import { diasDelMes, partes, type Fecha } from './fechas';

/**
 * Avance de la meta del mes: % logrado, lo que falta, cuánto vender por día (contando hoy) y si al ritmo actual se logra.
 * Proyección = lo vendido ÷ días transcurridos × días del mes.
 */
export function avanceMeta(d: { meta: number; vendido: number; hoy: Fecha }) {
  const { anio, mes, dia } = partes(d.hoy);
  const dias = diasDelMes(anio, mes);
  const falta = Math.max(0, d.meta - d.vendido);
  const quedan = dias - dia + 1;
  const proyeccion = Math.round((d.vendido / dia) * dias);
  const estado: 'lograda' | 'vasBien' | 'atrasado' = d.vendido >= d.meta ? 'lograda' : proyeccion >= d.meta ? 'vasBien' : 'atrasado';
  return {
    porcentaje: d.meta > 0 ? Math.round((d.vendido / d.meta) * 100) : 0,
    falta,
    porDia: falta > 0 ? Math.ceil(falta / quedan) : 0,
    proyeccion,
    estado,
  };
}
