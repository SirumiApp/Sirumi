import { usePerfil } from '@/auth/perfil';
import { impuestoDelPais, tasaVentas } from '@/lib/impuestosPais';
import { useNegocio } from '@/negocio/contexto';

/** B13 · Los datos de impuestos del negocio según el país de la persona. */
export function useTributario() {
  const perfil = usePerfil();
  const { negocio, parametros } = useNegocio();
  const pais = perfil?.country ?? 'CO';
  const conf = negocio?.configuracion ?? {};
  return {
    parametros,
    regimen: negocio?.regimen ?? null,
    pais,
    colombia: pais === 'CO',
    /** Código del impuesto a las ventas (iva, igv, itbms…), para mostrarlo con t(`impuestosPais.nombres.${impuesto}`). */
    impuesto: impuestoDelPais(pais).impuesto,
    tasaVentas: tasaVentas(pais, conf.tasa_ventas, parametros?.iva),
    tasaUtilidad: conf.tasa_utilidad ?? null,
  };
}
