// Metas, deudas y patrimonio (docs/reglas-de-calculo.md, A5, A6 y A7). Funciones puras.

import { armarFecha, partes, type Fecha } from './fechas';
import { deudaPrioritaria, interesesDelMes, patrimonio } from './personal';
import { progresoMeta } from './plan';

export type MetaBase = { objetivo: number; ahorrado: number };
export type DeudaBase = { id: string; saldo: number; tasaEA: number };

/** A5 · Progreso (0–100), lo que falta y si ya se cumplió. */
export function resumenMeta(meta: MetaBase): { porcentaje: number; faltan: number; cumplida: boolean } {
  return {
    porcentaje: progresoMeta(meta.ahorrado, meta.objetivo),
    faltan: Math.max(0, meta.objetivo - meta.ahorrado),
    cumplida: meta.ahorrado >= meta.objetivo,
  };
}

/** A6 · Total que se debe, intereses estimados del mes (suma de cada deuda) y la que conviene pagar primero. */
export function resumenDeudas<T extends DeudaBase>(deudas: T[]): { total: number; interesesMes: number; prioritaria: T | null } {
  return {
    total: deudas.reduce((s, d) => s + d.saldo, 0),
    interesesMes: deudas.reduce((s, d) => s + interesesDelMes(d.saldo, d.tasaEA), 0),
    prioritaria: deudaPrioritaria(deudas),
  };
}

/** A7 · Patrimonio de hoy con sus partes. */
export function patrimonioActual(activos: { valor: number }[], metas: MetaBase[], deudas: { saldo: number }[]) {
  const totalActivos = activos.reduce((s, a) => s + a.valor, 0);
  const ahorradoEnMetas = metas.reduce((s, m) => s + m.ahorrado, 0);
  const totalDeudas = deudas.reduce((s, d) => s + d.saldo, 0);
  return {
    activos: totalActivos,
    ahorradoEnMetas,
    deudas: totalDeudas,
    neto: patrimonio({ activos: totalActivos, ahorradoEnMetas, deudas: totalDeudas }),
  };
}

/** A7 · Evolución: una foto por mes ("AAAA-MM"). Sin foto, se repite el mes anterior; antes de la primera, vacío. */
export function serieDePatrimonio(fotos: { mes: string; neto: number }[], hoy: Fecha, cuantos = 6): { mes: string; neto: number | null }[] {
  const { anio, mes } = partes(hoy);
  const meses: string[] = [];
  for (let i = cuantos - 1; i >= 0; i--) {
    const total = anio * 12 + (mes - 1) - i;
    meses.push(armarFecha(Math.floor(total / 12), (total % 12) + 1, 1).slice(0, 7));
  }
  const ordenadas = [...fotos].sort((a, b) => (a.mes < b.mes ? -1 : 1));
  return meses.map((m) => {
    const anterior = ordenadas.filter((f) => f.mes <= m).pop();
    return { mes: m, neto: anterior ? anterior.neto : null };
  });
}
