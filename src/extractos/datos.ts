import { modoEjemploActivo, sinGuardar } from '@/ejemplo/modo';
import type { Fecha } from '@/lib/fechas';
import type { TipoNegocio } from '@/lib/negocio';
import { supabase } from '@/lib/supabase';

export type Ambito = 'negocio' | 'personal';

/** Un extracto ya subido ("Bancolombia · agosto 2026"). */
export type Extracto = {
  id: string;
  cuenta: string | null;
  mes: string;
  archivo: string | null;
  filas: number;
  entradas: number;
  salidas: number;
  fecha: string;
};

export async function cargarExtractos(ambito: Ambito, negocioId: string | null): Promise<Extracto[]> {
  if (modoEjemploActivo()) return [];
  let consulta = supabase
    .from('statement_imports')
    .select('id, account_id, month, file_name, rows, inflows, outflows, created_at')
    .eq('owner_type', ambito)
    .order('month', { ascending: false })
    .order('created_at', { ascending: false });
  if (ambito === 'negocio') {
    if (!negocioId) return [];
    consulta = consulta.eq('business_id', negocioId);
  }
  const { data } = await consulta;
  return (data ?? []).map((e) => ({
    id: e.id,
    cuenta: e.account_id,
    mes: e.month,
    archivo: e.file_name,
    filas: e.rows,
    entradas: e.inflows,
    salidas: e.outflows,
    fecha: e.created_at,
  }));
}

/** Movimientos personales (con signo) entre dos fechas, para marcar duplicados (B9). */
export async function movimientosPersonalesEntre(desde: Fecha, hasta: Fecha): Promise<{ fecha: Fecha; monto: number }[]> {
  if (modoEjemploActivo()) return [];
  const { data } = await supabase.from('movements').select('date, kind, amount').eq('owner_type', 'personal').gte('date', desde).lte('date', hasta);
  return (data ?? []).map((m) => ({ fecha: m.date, monto: m.kind === 'ingreso' ? m.amount : -m.amount }));
}

export type FilaImportar = { fecha: Fecha; descripcion: string; monto: number; tipo?: TipoNegocio; categoria?: string | null };

/** B9 · Importa de una vez: movimientos + registro del extracto (+ ajuste del saldo inicial en el negocio). */
export async function importarExtracto(datos: { ambito: Ambito; negocioId: string | null; cuenta: string | null; mes: string; archivo: string; filas: FilaImportar[] }) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('importar_extracto', {
    datos: {
      ambito: datos.ambito,
      business_id: datos.negocioId,
      account_id: datos.cuenta,
      month: datos.mes,
      file_name: datos.archivo,
      rows: datos.filas.map((f) => ({ date: f.fecha, description: f.descripcion, amount: f.monto, kind: f.tipo ?? null, category_id: f.categoria ?? null })),
    },
  });
}

export async function deshacerImportacion(id: string) {
  if (modoEjemploActivo()) return sinGuardar();
  return supabase.rpc('deshacer_importacion', { importacion: id });
}
