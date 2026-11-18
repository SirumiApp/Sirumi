import { partes, sumarDias, type Fecha, type Periodo } from '@/lib/fechas';

export type TextosFecha = { hoy: string; ayer: string; mesesCortos: string[]; mesesLargos: string[] };

/** "Hoy", "Ayer", "13 nov" (o "13 nov 2025" si es de otro año). */
export function etiquetaDia(fecha: Fecha, hoy: Fecha, textos: TextosFecha): string {
  if (fecha === hoy) return textos.hoy;
  if (fecha === sumarDias(hoy, -1)) return textos.ayer;
  return fechaCorta(fecha, textos, partes(fecha).anio !== partes(hoy).anio);
}

/** "15 nov" o "15 nov 2026". */
export function fechaCorta(fecha: Fecha, textos: Pick<TextosFecha, 'mesesCortos'>, conAnio = false): string {
  const { anio, mes, dia } = partes(fecha);
  return `${dia} ${textos.mesesCortos[mes - 1]}${conAnio ? ` ${anio}` : ''}`;
}

/** "noviembre" para comparar ("vs noviembre"). */
export function nombreMes(fecha: Fecha, textos: Pick<TextosFecha, 'mesesLargos'>): string {
  return textos.mesesLargos[partes(fecha).mes - 1];
}

/** "1 – 15 nov 2026" para mostrar un rango elegido en el calendario. */
export function rangoCorto(p: Periodo, textos: Pick<TextosFecha, 'mesesCortos'>): string {
  const mismoAnio = partes(p.desde).anio === partes(p.hasta).anio;
  return `${fechaCorta(p.desde, textos, !mismoAnio)} – ${fechaCorta(p.hasta, textos, true)}`;
}
