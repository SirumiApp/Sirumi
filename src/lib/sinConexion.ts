// POS sin internet (ferias). Funciones puras: reconocer un error de conexión, armar el id de la venta
// y descontar del stock lo vendido que todavía no se ha subido.

import type { FilaStock } from './inventario';

/** ¿El error es por falta de internet (o señal tan mala que no respondió a tiempo)? Entonces la venta se guarda en el celular. */
export function esErrorDeConexion(error: unknown): boolean {
  if (!error) return false;
  const e = error as { message?: unknown; code?: unknown; name?: unknown };
  const texto = `${String(e.name ?? '')} ${String(e.message ?? error)}`.toLowerCase();
  if (/network|fetch|timeout|tiempo|abort|conexi|offline|internet|socket|econn|enotfound/.test(texto)) return true;
  return false;
}

/** Id único de la venta (lo pone el celular). Si se envía dos veces, el servidor la reconoce y no la duplica. */
export function idDeVenta(azar: () => number = Math.random): string {
  const h = Array.from({ length: 32 }, () => Math.floor(azar() * 16).toString(16));
  h[12] = '4';
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Stock que se muestra: el del servidor menos lo vendido sin internet que aún no se sube (nunca menos de 0). */
export function stockConPendientes(stock: FilaStock[], pendientes: { bodega: string | null; lineas: { variante: string | null; cantidad: number }[] }[]): FilaStock[] {
  const resta = new Map<string, number>();
  for (const p of pendientes) {
    if (!p.bodega) continue;
    for (const l of p.lineas) if (l.variante) resta.set(`${l.variante}|${p.bodega}`, (resta.get(`${l.variante}|${p.bodega}`) ?? 0) + l.cantidad);
  }
  if (resta.size === 0) return stock;
  return stock.map((s) => {
    const r = resta.get(`${s.variante}|${s.bodega}`);
    return r ? { ...s, cantidad: Math.max(0, s.cantidad - r) } : s;
  });
}

/** Espera una promesa como máximo `ms`; si no responde, falla como error de conexión. */
export function conLimite<T>(promesa: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const reloj = setTimeout(() => rechazar(new Error('timeout')), ms);
    Promise.resolve(promesa).then(
      (v) => {
        clearTimeout(reloj);
        resolver(v);
      },
      (e) => {
        clearTimeout(reloj);
        rechazar(e);
      },
    );
  });
}

/** Si alguna respuesta falló por falta de internet, lanza el error (para no guardar datos a medias). */
export function sinCortes(...respuestas: { error?: unknown }[]) {
  const corte = respuestas.find((r) => r.error && esErrorDeConexion(r.error));
  if (corte) throw corte.error;
}
