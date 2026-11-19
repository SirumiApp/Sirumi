import { usePerfil } from '@/auth/perfil';
import { impuestoDelPais, impuestoIncluido, tasaVentas } from '@/lib/impuestosPais';
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

/** D6 · Precio sin IVA (lo que de verdad es del negocio) si cobra IVA incluido en el precio; si no, el mismo precio. */
export function usePrecioSinIva(): (precio: number, tarifaProducto?: number | null) => number {
  const { negocio } = useNegocio();
  const { tasaVentas } = useTributario();
  const cobra = !!negocio?.configuracion.responsable_iva;
  return (precio, tarifaProducto) => (cobra ? precio - impuestoIncluido(precio, tarifaProducto ?? tasaVentas) : precio);
}
