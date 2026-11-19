import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Descuento, LineaCarrito } from '@/lib/pos';

import type { Venta } from './datos';

/** Lo que se muestra en "Venta lista" (comprobante). */
export type Comprobante = Pick<Venta, 'numero' | 'subtotal' | 'descuento' | 'total' | 'pagos' | 'vuelto' | 'iva' | 'tarifaIva' | 'ivaIncluido'> & {
  lineas: { nombre: string; precio: number; cantidad: number }[];
  cliente: string | null;
  celularCliente: string | null;
  /** Se guardó sin internet: el número se pone al subirla. */
  pendiente?: boolean;
};

type EstadoPos = {
  bodega: string | null;
  lineas: LineaCarrito[];
  descuento: Descuento;
  cliente: string | null;
  /** Clave de la forma de pago (ver formasDePago) y, si se divide, la segunda y su %. */
  forma: string | null;
  dividido: boolean;
  segundaForma: string | null;
  porcentaje: number;
  recibido: number | null;
  /** D6 · Lo normal: el precio ya incluye el IVA. */
  ivaIncluido: boolean;
  /** D7 · Código de descuento aplicado (el descuento queda en `descuento`). */
  codigo: string | null;
  comprobante: Comprobante | null;
};

type ContextoPos = EstadoPos & {
  cambiar: (c: Partial<EstadoPos>) => void;
  agregar: (l: Omit<LineaCarrito, 'cantidad' | 'clave'> & { clave?: string }) => void;
  cambiarCantidad: (clave: string, cantidad: number) => void;
  /** Deja el carrito vacío para una venta nueva (mantiene la bodega). */
  nuevaVenta: () => void;
};

const INICIAL: EstadoPos = {
  bodega: null,
  lineas: [],
  descuento: null,
  cliente: null,
  forma: 'efectivo',
  dividido: false,
  segundaForma: null,
  porcentaje: 50,
  recibido: null,
  ivaIncluido: true,
  codigo: null,
  comprobante: null,
};

const Contexto = createContext<ContextoPos | null>(null);

/** Carrito del POS: vive mientras la persona está en el POS (catálogo → cobrar → venta lista). */
export function ProveedorPos({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoPos>(INICIAL);
  const cambiar = useCallback((c: Partial<EstadoPos>) => setEstado((e) => ({ ...e, ...c })), []);

  const agregar = useCallback((l: Omit<LineaCarrito, 'cantidad' | 'clave'> & { clave?: string }) => {
    setEstado((e) => {
      const clave = l.clave ?? l.variante ?? `libre-${Date.now()}`;
      const ya = e.lineas.find((x) => x.clave === clave);
      const lineas = ya ? e.lineas.map((x) => (x.clave === clave ? { ...x, cantidad: x.cantidad + 1 } : x)) : [...e.lineas, { ...l, clave, cantidad: 1 }];
      return { ...e, lineas };
    });
  }, []);

  const cambiarCantidad = useCallback((clave: string, cantidad: number) => {
    setEstado((e) => ({ ...e, lineas: cantidad <= 0 ? e.lineas.filter((x) => x.clave !== clave) : e.lineas.map((x) => (x.clave === clave ? { ...x, cantidad } : x)) }));
  }, []);

  const nuevaVenta = useCallback(() => setEstado((e) => ({ ...INICIAL, bodega: e.bodega })), []);

  const valor = useMemo(() => ({ ...estado, cambiar, agregar, cambiarCantidad, nuevaVenta }), [estado, cambiar, agregar, cambiarCantidad, nuevaVenta]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePos(): ContextoPos {
  const c = useContext(Contexto);
  if (!c) throw new Error('usePos debe usarse dentro de ProveedorPos');
  return c;
}
