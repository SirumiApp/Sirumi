// El servidor entrega máximo 1.000 filas por consulta (max_rows de Supabase).
// Para lo que tiene que estar completo (saldos, stock, exportar) se pide por páginas hasta traer todo.

export const TAMANO_PAGINA = 1000;

type Respuesta<T> = { data: T[] | null; error: unknown };

/**
 * Pide todas las filas de una consulta, página por página. `pedir(desde, hasta)` arma la consulta con `.range(desde, hasta)`
 * (tiene que tener un orden estable, p. ej. terminar en `.order('id')`).
 */
export async function todasLasFilas<T>(pedir: (desde: number, hasta: number) => PromiseLike<Respuesta<T>>, tamano = TAMANO_PAGINA): Promise<{ data: T[]; error: unknown }> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += tamano) {
    const r = await pedir(desde, desde + tamano - 1);
    if (r.error) return { data: filas, error: r.error };
    const pagina = r.data ?? [];
    filas.push(...pagina);
    if (pagina.length < tamano) return { data: filas, error: null };
  }
}
