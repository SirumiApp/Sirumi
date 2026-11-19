import { guardarNegocioEnEjemplo } from '@/ejemplo/arenero';
import { modoEjemploActivo } from '@/ejemplo/modo';
import { ajusteDeArqueo } from '@/lib/arqueo';
import type { Fecha } from '@/lib/fechas';
import { supabase } from '@/lib/supabase';

export type Arqueo = { id: string; cuenta: string; esperado: number; contado: number; diferencia: number; ajustado: boolean; creado: string };

/** Los últimos conteos de caja del negocio (D10). */
export async function cargarArqueos(negocioId: string): Promise<Arqueo[]> {
  if (modoEjemploActivo()) return [];
  const { data } = await supabase
    .from('cash_counts')
    .select('id, account_id, expected, counted, difference, adjusted, created_at')
    .eq('business_id', negocioId)
    .order('created_at', { ascending: false })
    .limit(10);
  return (data ?? []).map((a) => ({ id: a.id, cuenta: a.account_id, esperado: a.expected, contado: a.counted, diferencia: a.difference ?? a.counted - a.expected, ajustado: a.adjusted, creado: a.created_at }));
}

/** Guarda el conteo y, si `ajustar`, el movimiento para que la caja cuadre (D10). */
export async function registrarArqueo(d: { negocioId: string; cuenta: string; fecha: Fecha; esperado: number; contado: number; ajustar: boolean; textos: { faltante: string; sobrante: string } }) {
  if (modoEjemploActivo()) {
    // En el ejemplo, el ajuste queda en la memoria del celular.
    const ajuste = d.ajustar ? ajusteDeArqueo(d.contado - d.esperado) : null;
    if (ajuste) guardarNegocioEnEjemplo({ fecha: d.fecha, tipo: ajuste.tipo, monto: ajuste.monto, pagado: true, cuenta: d.cuenta, tarjeta: null, concepto: ajuste.tipo === 'venta' ? d.textos.sobrante : d.textos.faltante });
    return { error: null };
  }
  return supabase.rpc('registrar_arqueo', {
    datos: { business_id: d.negocioId, account_id: d.cuenta, date: d.fecha, expected: Math.round(d.esperado), counted: Math.round(d.contado), adjust: d.ajustar, faltante: d.textos.faltante, sobrante: d.textos.sobrante },
  });
}
