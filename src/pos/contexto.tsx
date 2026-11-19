import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Descuento, LineaCarrito } from '@/lib/pos';

import type { Venta } from './datos';

/** Lo que se muestra en "Venta lista" (comprobante). */
export type Comprobante = Pick<Venta, 'numero' | 'subtotal' | 'descuento' | 'total' | 'pagos' | 'vuelto' | 'iva' | 'tarifaIva' | 'ivaIncluido'> & {
  lineas: { nombre: string; precio: number; cantidad: number }[];
  cliente: string | null;
  celularCliente: string | null;
  /** D6b · IVA por tarifa cuando hay productos con tarifas distintas: [tarifa, valor]. */
  porTarifa?: [number, number][];
  /** D4b · Plata ya devuelta por devoluciones parciales. */
  devuelto?: number;
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

/** D11 · Una venta en espera: el carrito de un cliente mientras se atiende a otro. */
export type CarritoEnEspera = { id: string; creado: string; bodega: string | null; lineas: LineaCarrito[]; descuento: Descuento; cliente: string | null; codigo: string | null; ivaIncluido: boolean };

const CLAVE_ESPERA = 'sirumi.carritosEnEspera';

type ContextoPos = EstadoPos & {
  /** D11 · Ventas en espera (se guardan en el celular). */
  enEspera: CarritoEnEspera[];
  /** Pone el carrito actual en espera y deja uno vacío. */
  ponerEnEspera: () => void;
  /** Retoma una venta en espera (si hay algo en el carrito, ese pasa a espera). */
  retomar: (id: string) => void;
  descartarEspera: (id: string) => void;
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

  const [enEspera, setEnEspera] = useState<CarritoEnEspera[]>([]);
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_ESPERA)
      .then((v) => v && setEnEspera(JSON.parse(v) as CarritoEnEspera[]))
      .catch(() => {});
  }, []);
  const guardarEspera = useCallback((lista: CarritoEnEspera[]) => {
    setEnEspera(lista);
    AsyncStorage.setItem(CLAVE_ESPERA, JSON.stringify(lista)).catch(() => {});
  }, []);
  const aEspera = (e: EstadoPos): CarritoEnEspera => ({
    id: `espera-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    creado: new Date().toISOString(),
    bodega: e.bodega,
    lineas: e.lineas,
    descuento: e.descuento,
    cliente: e.cliente,
    codigo: e.codigo,
    ivaIncluido: e.ivaIncluido,
  });
  const ponerEnEspera = useCallback(() => {
    if (!estado.lineas.length) return;
    guardarEspera([...enEspera, aEspera(estado)]);
    setEstado((e) => ({ ...INICIAL, bodega: e.bodega }));
  }, [estado, enEspera, guardarEspera]);
  const retomar = useCallback(
    (id: string) => {
      const c = enEspera.find((x) => x.id === id);
      if (!c) return;
      const resto = enEspera.filter((x) => x.id !== id);
      guardarEspera(estado.lineas.length ? [...resto, aEspera(estado)] : resto);
      setEstado({ ...INICIAL, bodega: c.bodega ?? estado.bodega, lineas: c.lineas, descuento: c.descuento, cliente: c.cliente, codigo: c.codigo, ivaIncluido: c.ivaIncluido });
    },
    [estado, enEspera, guardarEspera],
  );
  const descartarEspera = useCallback((id: string) => guardarEspera(enEspera.filter((x) => x.id !== id)), [enEspera, guardarEspera]);

  const valor = useMemo(
    () => ({ ...estado, cambiar, agregar, cambiarCantidad, nuevaVenta, enEspera, ponerEnEspera, retomar, descartarEspera }),
    [estado, cambiar, agregar, cambiarCantidad, nuevaVenta, enEspera, ponerEnEspera, retomar, descartarEspera],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePos(): ContextoPos {
  const c = useContext(Contexto);
  if (!c) throw new Error('usePos debe usarse dentro de ProveedorPos');
  return c;
}
