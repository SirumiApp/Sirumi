// C8 · Importar y exportar el catálogo de productos en CSV (docs/reglas-de-calculo.md). Funciones puras.

export type FilaCatalogo = { talla: string | null; color: string | null; codigo: string; cantidad: number };
export type ProductoCatalogo = { nombre: string; coleccion: string | null; precio: number; costo: number; minimo: number; variantes: FilaCatalogo[] };
export type ErrorCatalogo = {
  fila: number;
  codigo: 'catalogoSinColumnas' | 'catalogoSinNombre' | 'catalogoSinPrecio' | 'catalogoCantidad' | 'catalogoCodigoRepetido';
  nombre?: string;
  valor?: string;
};

/** Separa un CSV en filas y celdas. Acepta coma o punto y coma (el que más aparezca en la primera línea) y comillas. */
export function separarCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, '');
  const primera = limpio.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ';' : ',';
  const filas: string[][] = [];
  let fila: string[] = [];
  let actual = '';
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') comillas = false;
      else actual += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) {
      fila.push(actual);
      actual = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(actual);
      filas.push(fila);
      fila = [];
      actual = '';
    } else actual += c;
  }
  if (actual !== '' || fila.length) {
    fila.push(actual);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((x) => x.trim() !== ''));
}

const comparable = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Títulos aceptados (español e inglés) para cada columna. */
const COLUMNAS: Record<keyof Omit<ProductoCatalogo, 'variantes'> | keyof FilaCatalogo, string[]> = {
  nombre: ['nombre', 'producto', 'name', 'product'],
  coleccion: ['coleccion', 'collection', 'categoria', 'category'],
  precio: ['precio', 'precio de venta', 'price', 'sale price'],
  costo: ['costo', 'costo por unidad', 'cost', 'unit cost'],
  talla: ['talla', 'size'],
  color: ['color', 'colour'],
  codigo: ['codigo', 'codigo de barras', 'barcode', 'code', 'sku'],
  cantidad: ['cantidad', 'stock', 'unidades', 'quantity', 'qty', 'units'],
  minimo: ['minimo', 'stock minimo', 'min', 'minimum', 'min stock'],
};

/** "$ 45.000" → 45000; vacío → null. */
const monto = (s: string | undefined) => {
  const d = (s ?? '').replace(/\D/g, '');
  return d ? Number(d) : null;
};

/**
 * C8 · Lee la plantilla: una fila por variante; filas con el mismo nombre son el mismo producto.
 * `existentes`: nombres de los productos que ya hay (se omiten). `codigosUsados`: códigos que ya tienen otros productos.
 */
export function leerCatalogo(texto: string, existentes: string[], codigosUsados: Set<string> = new Set()) {
  const filas = separarCsv(texto);
  const errores: ErrorCatalogo[] = [];
  const titulos = (filas[0] ?? []).map(comparable);
  const col = Object.fromEntries(Object.entries(COLUMNAS).map(([k, nombres]) => [k, titulos.findIndex((t) => nombres.includes(t))])) as Record<keyof typeof COLUMNAS, number>;
  if (col.nombre < 0) return { productos: [] as ProductoCatalogo[], errores: [{ fila: 1, codigo: 'catalogoSinColumnas' as const }], omitidos: [] as string[] };

  const ya = new Set(existentes.map(comparable));
  const porNombre = new Map<string, ProductoCatalogo>();
  const conError = new Set<string>();
  const omitidos = new Set<string>();
  const codigos = new Set(codigosUsados);
  const valor = (f: string[], k: keyof typeof COLUMNAS) => (col[k] >= 0 ? (f[col[k]] ?? '').trim() : '');

  filas.slice(1).forEach((f, i) => {
    const fila = i + 2;
    const nombre = valor(f, 'nombre');
    if (!nombre) return errores.push({ fila, codigo: 'catalogoSinNombre' });
    const clave = comparable(nombre);
    if (ya.has(clave)) {
      const primero = porNombre.get(clave)?.nombre ?? nombre;
      omitidos.add(primero);
      return;
    }
    let p = porNombre.get(clave);
    if (!p) {
      const precio = monto(valor(f, 'precio'));
      p = { nombre, coleccion: valor(f, 'coleccion') || null, precio: precio ?? 0, costo: monto(valor(f, 'costo')) ?? 0, minimo: monto(valor(f, 'minimo')) ?? 0, variantes: [] };
      porNombre.set(clave, p);
      if (!precio) {
        conError.add(clave);
        return errores.push({ fila, codigo: 'catalogoSinPrecio', nombre });
      }
    }
    const textoCantidad = valor(f, 'cantidad');
    if (textoCantidad && !/^\d+$/.test(textoCantidad.replace(/[.\s]/g, ''))) {
      conError.add(clave);
      return errores.push({ fila, codigo: 'catalogoCantidad', nombre });
    }
    const codigo = valor(f, 'codigo');
    if (codigo && codigos.has(codigo)) {
      conError.add(clave);
      return errores.push({ fila, codigo: 'catalogoCodigoRepetido', nombre, valor: codigo });
    }
    if (codigo) codigos.add(codigo);
    p.variantes.push({ talla: valor(f, 'talla') || null, color: valor(f, 'color') || null, codigo, cantidad: monto(textoCantidad) ?? 0 });
  });

  const productos = [...porNombre.entries()].filter(([k]) => !conError.has(k)).map(([, p]) => p);
  return { productos, errores, omitidos: [...omitidos] };
}

/** C8 · Exporta en el mismo formato de la plantilla (separado por punto y coma, como lo abre Excel en Colombia). */
export function catalogoACsv(productos: ProductoCatalogo[]): string {
  // Sin fórmulas escondidas para Excel; entre comillas si trae punto y coma, comillas o saltos de línea.
  const c = (v: string) => {
    const t = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const filas = ['nombre;coleccion;precio;costo;talla;color;codigo;cantidad;minimo'];
  for (const p of productos) {
    for (const v of p.variantes) {
      filas.push([c(p.nombre), c(p.coleccion ?? ''), String(p.precio), String(p.costo), c(v.talla ?? ''), c(v.color ?? ''), c(v.codigo), String(v.cantidad), String(p.minimo)].join(';'));
    }
  }
  return filas.join('\r\n');
}
