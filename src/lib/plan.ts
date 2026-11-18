// Reglas A4 (plan del mes) y A5 (meta con fecha) de docs/reglas-de-calculo.md.
// Funciones puras: no redondean en pasos intermedios; se redondea solo al mostrar o guardar.

import type { CodigoError } from './validacion';

export type Objetivo = 'ver' | 'ahorro' | 'meta' | 'deudas';
/** Código del estado: se muestra con t(`plan.estado.${estado}`) → "Vas bien", "Cuidado" o "Te pasaste". */
export type EstadoPlan = 'bien' | 'cuidado' | 'tePasaste';

/** Por encima de este porcentaje del disponible se muestra "Cuidado". */
export const UMBRAL_CUIDADO = 0.8;

/** A4 · Disponible para gastar = ingreso mensual − monto a separar. */
export function disponibleParaGastar(ingresoMensual: number, montoSeparar: number): number {
  return ingresoMensual - montoSeparar;
}

/** A4 · Le queda = disponible − gastado del período. */
export function leQueda(disponible: number, gastado: number): number {
  return disponible - gastado;
}

/** A4 · Por día (solo en el mes actual) = le queda / (días del mes − día de hoy + 1). */
export function porDia(queda: number, hoy: { diasDelMes: number; diaDeHoy: number }): number {
  return queda / (hoy.diasDelMes - hoy.diaDeHoy + 1);
}

/** A4 · "Te pasaste" si le queda < 0; "Cuidado" si gastado ≥ 80% del disponible; si no, "Vas bien". */
export function estadoDelPlan(disponible: number, gastado: number): EstadoPlan {
  if (leQueda(disponible, gastado) < 0) return 'tePasaste';
  if (gastado >= disponible * UMBRAL_CUIDADO) return 'cuidado';
  return 'bien';
}

/** A5 · Cuota mensual = techo(monto de la meta / meses). */
export function cuotaMensualMeta(montoMeta: number, meses: number): number {
  if (meses <= 0) return 0;
  return Math.ceil(montoMeta / meses);
}

/** A5 · Progreso = mín(100, redondear(ahorrado / objetivo × 100)). */
export function progresoMeta(ahorrado: number, objetivo: number): number {
  if (objetivo <= 0) return 0;
  return Math.min(100, Math.round((ahorrado / objetivo) * 100));
}

/** A5 · Abonar nunca supera el objetivo. */
export function abonarAMeta(ahorrado: number, abono: number, objetivo: number): number {
  return Math.min(objetivo, ahorrado + abono);
}

export type DatosPlan = {
  objetivo: Objetivo;
  ahorro?: number;
  abono?: number;
  metaValor?: number;
  metaMeses?: number;
};

/** Cuánto se separa al mes según el objetivo elegido en el onboarding. */
export function montoASeparar(datos: DatosPlan): number {
  switch (datos.objetivo) {
    case 'ahorro':
      return datos.ahorro ?? 0;
    case 'deudas':
      return datos.abono ?? 0;
    case 'meta':
      return cuotaMensualMeta(datos.metaValor ?? 0, datos.metaMeses ?? 0);
    case 'ver':
      return 0;
  }
}

/** El plan es válido solo si 0 < monto < ingreso. Devuelve el código del mensaje de error o null. */
export function validarPlan(ingresoMensual: number, montoSeparar: number): CodigoError | null {
  if (ingresoMensual <= 0) return 'planSinIngreso';
  if (montoSeparar <= 0) return 'planSinMonto';
  if (montoSeparar >= ingresoMensual) return 'planMontoMayor';
  return null;
}
