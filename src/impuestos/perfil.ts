import type { PerfilTributario } from '@/lib/calendarioTributario';
import type { Negocio } from '@/negocio/datos';

/** B12 · Lo que el calendario necesita saber del negocio (régimen y lo que llenó en el calendario). */
export function perfilTributario(negocio: Negocio): PerfilTributario {
  const c = negocio.configuracion;
  return {
    regimen: negocio.regimen,
    digito: typeof c.digito_nit === 'number' ? c.digito_nit : null,
    responsableIva: !!c.responsable_iva,
    agenteRetencion: !!c.agente_retencion,
    periodoIva: c.periodo_iva ?? 'bimestral',
  };
}
