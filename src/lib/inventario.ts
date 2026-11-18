// Productos e inventario (docs/reglas-de-calculo.md, sección C). Funciones puras.
// Los cambios de stock reales los hace la base de datos (funciones de Postgres); aquí se calculan y validan.

/** C1 · Costo por unidad = materia prima + mano de obra + empaque + otros. */
export function costoUnitario(d: { materia: number; manoDeObra: number; empaque: number; otros: number }): number {
  return d.materia + d.manoDeObra + d.empaque + d.otros;
}

/** C1 · Lo que ganas por unidad y el margen bruto (0 a 1). */
export function margenProducto(precio: number, costo: number) {
  const ganancia = precio - costo;
  return { ganancia, margen: precio > 0 ? ganancia / precio : 0 };
}

/** Una fila de stock: unidades de una variante en una bodega. */
export type FilaStock = { variante: string; bodega: string; cantidad: number };

/** C2 · Stock de una variante: suma de sus bodegas, o de una sola. */
export function stockDeVariante(variante: string, stock: FilaStock[], bodega?: string): number {
  return stock.filter((s) => s.variante === variante && (!bodega || s.bodega === bodega)).reduce((t, s) => t + s.cantidad, 0);
}

/** C2 · Stock de un producto: suma de sus variantes. */
export function stockDeProducto(variantes: string[], stock: FilaStock[], bodega?: string): number {
  return variantes.reduce((t, v) => t + stockDeVariante(v, stock, bodega), 0);
}

/** C2/C3 · Una salida nunca deja el stock negativo. */
export function validarSalida(cantidad: number, disponible: number) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) return { codigo: 'cantidadInvalida' as const, disponible };
  if (cantidad > disponible) return { codigo: 'stockInsuficiente' as const, disponible };
  return null;
}

type ProductoValor = { precio: number; costo: number; minimo: number; variantes: string[] };

/** C5 · Valor del inventario a costo y a precio de venta (total o de una bodega). */
export function valorInventario(productos: ProductoValor[], stock: FilaStock[], bodega?: string) {
  let unidades = 0;
  let aCosto = 0;
  let aPrecio = 0;
  for (const p of productos) {
    const u = stockDeProducto(p.variantes, stock, bodega);
    unidades += u;
    aCosto += u * p.costo;
    aPrecio += u * p.precio;
  }
  return { unidades, aCosto, aPrecio, ganancia: aPrecio - aCosto };
}

/** C5 · "Por reponer" si el stock total es menor al mínimo. */
export function porReponer(p: ProductoValor, stock: FilaStock[]): boolean {
  return p.minimo > 0 && stockDeProducto(p.variantes, stock) < p.minimo;
}

/** C6 · Dígito de control EAN-13 de los 12 primeros dígitos (×1 en posición impar, ×3 en par, desde la izquierda). */
export function digitoControlEan13(doce: string): number {
  const suma = [...doce].reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (suma % 10)) % 10;
}

export function esEan13Valido(codigo: string): boolean {
  return /^\d{13}$/.test(codigo) && digitoControlEan13(codigo.slice(0, 12)) === Number(codigo[12]);
}

/** C6 · Código interno: "29" + 10 dígitos + control. `azar` se puede fijar en las pruebas. */
export function codigoInterno(azar: () => number = Math.random): string {
  const diez = String(Math.floor(azar() * 1e10)).padStart(10, '0');
  const doce = `29${diez}`;
  return `${doce}${digitoControlEan13(doce)}`;
}

export type Variante = { color: string | null; talla: string | null; nombre: string };

/** C7 · Variantes = colores × tallas; nombre "Color / Talla", o la única dimensión, o "Única". */
export function armarVariantes(tallas: string[], colores: string[]): Variante[] {
  if (!tallas.length && !colores.length) return [{ color: null, talla: null, nombre: 'Única' }];
  if (!colores.length) return tallas.map((t) => ({ color: null, talla: t, nombre: t }));
  if (!tallas.length) return colores.map((c) => ({ color: c, talla: null, nombre: c }));
  return colores.flatMap((c) => tallas.map((t) => ({ color: c, talla: t, nombre: `${c} / ${t}` })));
}

/** Nombre visible de una variante guardada. */
export function nombreVariante(v: { color: string | null; talla: string | null }): string {
  return armarVariantes(v.talla ? [v.talla] : [], v.color ? [v.color] : [])[0].nombre;
}

/**
 * Nombre y precio obligatorios; los códigos no se repiten entre sus variantes ni con otro producto (C6).
 * `usados`: código → nombre del producto que ya lo tiene.
 */
export function validarProducto(d: { nombre: string; precio: number; codigos: string[] }, usados: Map<string, string> = new Map()) {
  if (!d.nombre.trim()) return { codigo: 'productoSinNombre' as const };
  if (!d.precio || d.precio <= 0) return { codigo: 'productoSinPrecio' as const };
  const vistos = new Set<string>();
  for (const c of d.codigos.map((x) => x.trim()).filter(Boolean)) {
    if (vistos.has(c)) return { codigo: 'codigoRepetido' as const, valor: c };
    vistos.add(c);
    const otro = usados.get(c);
    if (otro) return { codigo: 'codigoDeOtro' as const, valor: c, producto: otro };
  }
  return null;
}
