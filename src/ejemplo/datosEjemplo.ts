// Datos de ejemplo para el "modo ejemplo": inventados pero realistas, para entender la app sin registrar nada.
// Funciones puras: las fechas se arman a partir de "hoy", así siempre se ven al día. Nada de esto va a la base de datos.
// Los textos (conceptos, nombres) son claves de traducción bajo `ejemplo.textos`; las pantallas los traducen.

import { armarFecha, diasDelMes, partes, type Fecha } from '@/lib/fechas';
import { impuestoIncluido } from '@/lib/impuestosPais';
import type { Recurrente } from '@/lib/contactos';
import { armarVariantes, codigoInterno, type FilaStock } from '@/lib/inventario';
import type { MovNegocio, TipoNegocio, Transferencia } from '@/lib/negocio';
import type { LineaVenta } from '@/pos/datos';
import type { Movimiento } from '@/lib/personal';

/** Mes desplazado (0 = este mes, -1 = el anterior…) y un día dentro de él (cortado al último día del mes). */
function fechaEn(hoy: Fecha, mesesAtras: number, dia: number): Fecha {
  const { anio, mes } = partes(hoy);
  const total = anio * 12 + (mes - 1) + mesesAtras;
  const a = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return armarFecha(a, m, Math.min(dia, diasDelMes(a, m)));
}

/** Solo lo que ya pasó: nada con fecha después de hoy. */
const hastaHoy = <T extends { fecha: Fecha }>(hoy: Fecha, lista: T[]) => lista.filter((x) => x.fecha <= hoy);

// ───────────── Finanzas personales ─────────────

export const CATEGORIAS_EJEMPLO = [
  { id: 'ej-shopping', key: 'shopping', emoji: 'bolsas-de-compras', color: 'azul', kind: 'gasto', position: 1 },
  { id: 'ej-comida', key: 'comida', emoji: 'hamburguesa', color: 'naranja', kind: 'gasto', position: 2 },
  { id: 'ej-transporte', key: 'transporte', emoji: 'taxi', color: 'amarillo', kind: 'gasto', position: 3 },
  { id: 'ej-mercado', key: 'mercado', emoji: 'aguacate', color: 'verde', kind: 'gasto', position: 4 },
  { id: 'ej-salidas', key: 'salidas', emoji: 'bola-disco', color: 'morado', kind: 'gasto', position: 5 },
  { id: 'ej-mascotas', key: 'mascotas', emoji: 'perro', color: 'cafe', kind: 'gasto', position: 6 },
  { id: 'ej-ingreso', key: 'ingreso', emoji: 'bolsa-de-dinero', color: 'menta', kind: 'ingreso', position: 7 },
].map((c) => ({ ...c, name: null as string | null, hidden: false, user_id: 'ejemplo', created_at: '' }));

/** Un mes típico: [día, categoría, monto, clave del concepto]. */
const MES_PERSONAL: [number, string, number, string][] = [
  [1, 'ej-ingreso', 4_800_000, 'salario'],
  [2, 'ej-mercado', 245_000, 'mercado'],
  [3, 'ej-transporte', 14_000, 'taxi'],
  [4, 'ej-comida', 38_000, 'almuerzo'],
  [6, 'ej-salidas', 95_000, 'cine'],
  [7, 'ej-comida', 26_000, 'cafe'],
  [8, 'ej-transporte', 120_000, 'gasolina'],
  [9, 'ej-mercado', 168_000, 'mercado'],
  [11, 'ej-shopping', 189_000, 'ropa'],
  [12, 'ej-comida', 64_000, 'domicilio'],
  [14, 'ej-mascotas', 135_000, 'veterinaria'],
  [15, 'ej-ingreso', 650_000, 'freelance'],
  [16, 'ej-mercado', 212_000, 'mercado'],
  [17, 'ej-salidas', 140_000, 'cumpleanos'],
  [18, 'ej-comida', 42_000, 'almuerzo'],
  [20, 'ej-transporte', 18_000, 'taxi'],
  [22, 'ej-comida', 31_000, 'cafe'],
  [23, 'ej-mercado', 156_000, 'mercado'],
  [25, 'ej-shopping', 98_000, 'regalo'],
  [27, 'ej-salidas', 78_000, 'concierto'],
  [28, 'ej-comida', 55_000, 'domicilio'],
];

/** Seis meses de movimientos personales, con un poco de variación entre meses. */
export function movimientosPersonalesEjemplo(hoy: Fecha): Movimiento[] {
  const lista: Movimiento[] = [];
  for (let atras = 0; atras >= -5; atras--) {
    // Cada mes gasta un poco distinto (el actual, un poco más en salidas para que se vea un tope superado).
    const factor = [1, 0.92, 1.08, 0.97, 1.12, 0.9][-atras];
    MES_PERSONAL.forEach(([dia, categoria, monto, concepto], i) => {
      const ingreso = categoria === 'ej-ingreso';
      const extra = atras === 0 && categoria === 'ej-salidas' ? 1.35 : 1;
      lista.push({
        id: `ej-p${atras}-${i}`,
        fecha: fechaEn(hoy, atras, dia),
        tipo: ingreso ? 'ingreso' : 'gasto',
        monto: ingreso ? monto : Math.round((monto * factor * extra) / 100) * 100,
        categoria,
        descripcion: `ejemplo.textos.${concepto}`,
      });
    });
  }
  return hastaHoy(hoy, lista).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export const TOPES_EJEMPLO: Record<string, number> = {
  'ej-comida': 300_000,
  'ej-mercado': 900_000,
  'ej-salidas': 300_000,
  'ej-shopping': 350_000,
  'ej-transporte': 220_000,
};

/** Como lo guarda el onboarding en preferences.plan. */
export const PLAN_EJEMPLO = { objetivo: 'meta' as const, ingreso: 4_800_000, separar: 800_000, meta: 'ejemplo.textos.viaje' };

export function planPersonalEjemplo(hoy: Fecha) {
  const fotos = [-5, -4, -3, -2, -1, 0].map((atras, i) => ({ mes: fechaEn(hoy, atras, 1).slice(0, 7), neto: 2_100_000 + i * 640_000 }));
  return {
    metas: [
      { id: 'ej-m1', nombre: 'ejemplo.textos.viaje', emoji: 'avion', objetivo: 3_000_000, ahorrado: 1_250_000 },
      { id: 'ej-m2', nombre: 'ejemplo.textos.emergencias', emoji: 'salvavidas', objetivo: 6_000_000, ahorrado: 2_400_000 },
    ],
    deudas: [
      { id: 'ej-d1', nombre: 'ejemplo.textos.tarjeta', emoji: 'tarjeta', saldo: 2_300_000, tasaEA: 28, cuota: 250_000 },
      { id: 'ej-d2', nombre: 'ejemplo.textos.creditoMoto', emoji: 'moto', saldo: 5_800_000, tasaEA: 18, cuota: 420_000 },
    ],
    activos: [
      { id: 'ej-a1', nombre: 'ejemplo.textos.ahorros', emoji: 'alcancia', valor: 3_650_000 },
      { id: 'ej-a2', nombre: 'ejemplo.textos.moto', emoji: 'moto', valor: 7_500_000 },
    ],
    fotos,
    cargando: false,
  };
}

// ───────────── Negocio ─────────────

export const NEGOCIO_EJEMPLO = {
  id: 'ej-negocio',
  nombre: 'ejemplo.textos.negocio',
  regimen: 'simple' as const,
  configuracion: {
    ventas_mes: 10_000_000,
    fijos_mes: 3_200_000,
    costo_porcentaje: 45,
    grupo_actividad: 2 as const,
    por_cobrar_inicial: 300_000,
    equipos: 4_000_000,
    deuda_proveedores: 1_000_000,
    prestamos: 0,
    arranque_listo: true,
    digito_nit: 7,
    // Cobra IVA (lo normal es que el precio ya lo incluya): así se ve el 19% en el POS y en Resultados.
    responsable_iva: true,
  },
};

export const CUENTAS_EJEMPLO = [
  { id: 'ej-efectivo', nombre: 'ejemplo.textos.efectivo', tipo: 'efectivo' as const, saldoInicial: 600_000, principal: true },
  { id: 'ej-banco', nombre: 'Davivienda', tipo: 'banco' as const, saldoInicial: 6_000_000, principal: false },
  { id: 'ej-nequi', nombre: 'Nequi', tipo: 'billetera' as const, saldoInicial: 1_200_000, principal: false },
];

export const TARJETAS_EJEMPLO = [{ id: 'ej-visa', nombre: 'Visa', cupo: 5_000_000, deudaInicial: 1_200_000 }];

/** Clientes y proveedores inventados (nombres de negocios ficticios, sin datos de personas reales). */
export const CONTACTOS_EJEMPLO = [
  { id: 'ej-c-aurora', tipo: 'cliente' as const, nombre: 'Tienda Aurora', tipoDocumento: 'nit' as const, documento: '900000001', celular: '', correo: '', direccion: '', ciudad: 'Cali', notas: 'ejemplo.textos.notaAurora' },
  { id: 'ej-c-oficina', tipo: 'cliente' as const, nombre: 'Oficinas El Roble', tipoDocumento: null, documento: '', celular: '', correo: '', direccion: '', ciudad: 'Bogotá', notas: '' },
  { id: 'ej-c-granos', tipo: 'proveedor' as const, nombre: 'Granos del Huila', tipoDocumento: 'nit' as const, documento: '900000002', celular: '', correo: '', direccion: '', ciudad: 'Pitalito', notas: '' },
  { id: 'ej-c-empaques', tipo: 'proveedor' as const, nombre: 'Empaques Express', tipoDocumento: null, documento: '', celular: '', correo: '', direccion: '', ciudad: 'Medellín', notas: '' },
];

/** Pagos que se repiten cada mes (B10). Se enlazan con los gastos del mes típico de abajo. */
export const RECURRENTES_EJEMPLO: Recurrente[] = [
  { id: 'ej-r-arriendo', nombre: 'ejemplo.textos.arriendo', tipo: 'fijo', monto: 1_300_000, dia: 2, activo: true, cuenta: 'ej-banco' },
  { id: 'ej-r-nomina', nombre: 'ejemplo.textos.nomina', tipo: 'fijo', monto: 1_500_000, dia: 12, activo: true, cuenta: 'ej-banco' },
  { id: 'ej-r-servicios', nombre: 'ejemplo.textos.servicios', tipo: 'fijo', monto: 400_000, dia: 22, activo: true, cuenta: 'ej-banco' },
  { id: 'ej-r-contador', nombre: 'ejemplo.textos.contador', tipo: 'fijo', monto: 250_000, dia: 30, activo: true, cuenta: 'ej-banco' },
];

/** Pagos personales que se repiten cada mes (B10 en personal). */
export const RECURRENTES_PERSONALES_EJEMPLO: Recurrente[] = [
  { id: 'ej-rp-arriendo', nombre: 'ejemplo.textos.arriendoCasa', tipo: 'fijo', monto: 1_200_000, dia: 5, activo: true, categoria: null },
  { id: 'ej-rp-celular', nombre: 'ejemplo.textos.planCelular', tipo: 'fijo', monto: 65_000, dia: 12, activo: true, categoria: null },
  { id: 'ej-rp-plataformas', nombre: 'ejemplo.textos.plataformas', tipo: 'fijo', monto: 45_000, dia: 24, activo: true, categoria: 'ej-salidas' },
];

/** Los pagos personales de este mes que ya se hicieron (los que vencían antes de hoy, menos el último). */
export function pagosPersonalesEjemplo(hoy: Fecha): { fecha: Fecha; recurrente: string }[] {
  const dia = Number(hoy.slice(8, 10));
  return RECURRENTES_PERSONALES_EJEMPLO.filter((r) => r.dia < dia && r.id !== 'ej-rp-celular').map((r) => ({ fecha: `${hoy.slice(0, 8)}${String(r.dia).padStart(2, '0')}`, recurrente: r.id }));
}

/** Qué contacto o pago recurrente va con cada concepto del mes típico. */
const ENLACES: Record<string, { contacto?: string; recurrente?: string }> = {
  arriendo: { recurrente: 'ej-r-arriendo' },
  nomina: { recurrente: 'ej-r-nomina' },
  servicios: { recurrente: 'ej-r-servicios' },
  mayorista: { contacto: 'ej-c-aurora' },
  materiaPrima: { contacto: 'ej-c-granos' },
};

/** Un mes típico del negocio: [día, tipo, monto, cuenta o tarjeta, concepto]. Ventas 10.600.000, fijos 3.200.000, variables 1.000.000. */
const MES_NEGOCIO: [number, TipoNegocio, number, string, string][] = [
  [2, 'fijo', 1_300_000, 'ej-banco', 'arriendo'],
  [3, 'venta', 2_500_000, 'ej-efectivo', 'ventasFeria'],
  [5, 'compra', 1_800_000, 'ej-banco', 'materiaPrima'],
  [6, 'venta', 1_960_000, 'ej-nequi', 'ventasOnline'],
  [8, 'variable', 300_000, 'ej-visa', 'publicidad'],
  [10, 'venta', 2_850_000, 'ej-banco', 'mayorista'],
  [12, 'fijo', 1_500_000, 'ej-banco', 'nomina'],
  [14, 'venta', 2_260_000, 'ej-banco', 'ventasDatafono'],
  [15, 'variable', 450_000, 'ej-nequi', 'domicilios'],
  [16, 'retiro', 800_000, 'ej-banco', 'miSueldo'],
  [20, 'venta', 1_610_000, 'ej-nequi', 'ventasOnline'],
  [22, 'fijo', 400_000, 'ej-banco', 'servicios'],
  [25, 'venta', 1_430_000, 'ej-efectivo', 'ventasFeria'],
  [26, 'variable', 250_000, 'ej-banco', 'comisiones'],
  [28, 'impuesto', 160_000, 'ej-banco', 'simple'],
];

/** Tres meses de movimientos del negocio, con algo pendiente por cobrar y por pagar. */
export function movimientosNegocioEjemplo(hoy: Fecha): MovNegocio[] {
  const lista: MovNegocio[] = [];
  for (let atras = 0; atras >= -2; atras--) {
    MES_NEGOCIO.forEach(([dia, tipo, monto, donde, concepto], i) => {
      // Este mes, la venta al mayorista todavía no la han pagado.
      const pendiente = atras === 0 && concepto === 'mayorista';
      const conTarjeta = donde === 'ej-visa';
      lista.push({
        id: `ej-n${atras}-${i}`,
        fecha: fechaEn(hoy, atras, dia),
        tipo,
        monto,
        pagado: !pendiente,
        cuenta: pendiente || conTarjeta ? null : donde,
        tarjeta: !pendiente && conTarjeta ? donde : null,
        concepto: `ejemplo.textos.${concepto}`,
        contacto: ENLACES[concepto]?.contacto ?? null,
        recurrente: ENLACES[concepto]?.recurrente ?? null,
      });
    });
  }
  lista.push(
    { id: 'ej-n-aporte', fecha: fechaEn(hoy, -2, 4), tipo: 'aporte', monto: 1_000_000, pagado: true, cuenta: 'ej-banco', tarjeta: null, concepto: 'ejemplo.textos.aporte' },
    { id: 'ej-n-cliente', fecha: fechaEn(hoy, -2, 18), tipo: 'venta', monto: 830_000, pagado: false, cuenta: null, tarjeta: null, concepto: 'ejemplo.textos.clienteFiado', contacto: 'ej-c-oficina' },
    { id: 'ej-n-empaques', fecha: fechaEn(hoy, -1, 19), tipo: 'compra', monto: 800_000, pagado: false, cuenta: null, tarjeta: null, concepto: 'ejemplo.textos.empaques', contacto: 'ej-c-empaques' },
  );
  return hastaHoy(hoy, lista).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function trasladosEjemplo(hoy: Fecha): Transferencia[] {
  const lista: Transferencia[] = [
    // Cada mes se consigna el efectivo de las ferias en el banco.
    ...[0, -1, -2].map((atras) => ({ id: `ej-tc${atras}`, fecha: fechaEn(hoy, atras, 21), desde: 'ej-efectivo', haciaCuenta: 'ej-banco', haciaTarjeta: null, monto: 3_000_000, nota: 'ejemplo.textos.consignacion' })),
    { id: 'ej-t1', fecha: fechaEn(hoy, 0, 11), desde: 'ej-banco', haciaCuenta: 'ej-efectivo', haciaTarjeta: null, monto: 300_000, nota: 'ejemplo.textos.sencillo' },
    { id: 'ej-t2', fecha: fechaEn(hoy, 0, 17), desde: 'ej-banco', haciaCuenta: null, haciaTarjeta: 'ej-visa', monto: 500_000, nota: null },
    { id: 'ej-t3', fecha: fechaEn(hoy, -1, 17), desde: 'ej-banco', haciaCuenta: null, haciaTarjeta: 'ej-visa', monto: 300_000, nota: null },
  ];
  return hastaHoy(hoy, lista).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** ¿Es una clave de texto de ejemplo? (los nombres reales nunca empiezan así). */
export function esTextoEjemplo(texto: string | null | undefined): texto is string {
  return !!texto && texto.startsWith('ejemplo.textos.');
}

// ───────────── Inventario ─────────────

export const BODEGAS_EJEMPLO = [
  { id: 'ej-b-principal', nombre: 'ejemplo.textos.bodegaPrincipal', principal: true },
  { id: 'ej-b-feria', nombre: 'ejemplo.textos.bodegaFeria', principal: false },
];

/** Un código EAN-13 interno fijo para cada variante de ejemplo (siempre el mismo). */
let semilla = 0;
const codigoFijo = () => codigoInterno(() => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280));

function productoEjemplo(id: string, nombre: string, emoji: string, precio: number, costo: number, minimo: number, tallas: string[], colores: string[], coleccion: string | null, tarifaIva: number | null = null) {
  return {
    id,
    nombre: `ejemplo.textos.${nombre}`,
    coleccion: coleccion ? `ejemplo.textos.${coleccion}` : null,
    emoji,
    precio,
    costo,
    desglose: null,
    minimo,
    tarifaIva,
    foto: null,
    fotoUrl: null,
    variantes: armarVariantes(tallas, colores).map((v, i) => ({
      id: `${id}-v${i}`,
      color: v.color ? `ejemplo.textos.${v.color}` : null,
      talla: v.talla,
      codigo: codigoFijo(),
      nombre: v.nombre,
    })),
  };
}

export const PRODUCTOS_EJEMPLO = [
  productoEjemplo('ej-p-cafe', 'cafeEmpacado', 'paquete', 32_000, 14_400, 20, ['250 g', '500 g'], [], 'coleccionCafe', 5),
  // ↑ El café tostado lleva IVA del 5% en Colombia (D6b).
  productoEjemplo('ej-p-taza', 'taza', 'cafe', 28_000, 11_000, 6, [], ['blanco', 'negro'], 'coleccionAccesorios'),
  productoEjemplo('ej-p-camiseta', 'camiseta', 'camiseta', 45_000, 18_000, 10, ['S', 'M', 'L'], ['negro'], 'coleccionAccesorios'),
  productoEjemplo('ej-p-bolsa', 'bolsa', 'bolsas-de-compras', 15_000, 5_500, 0, [], [], 'coleccionAccesorios'),
];

/** [variante, principal, feria] */
const UNIDADES: [string, number, number][] = [
  ['ej-p-cafe-v0', 18, 6],
  ['ej-p-cafe-v1', 24, 10],
  ['ej-p-taza-v0', 9, 3],
  ['ej-p-taza-v1', 2, 0],
  ['ej-p-camiseta-v0', 4, 0],
  ['ej-p-camiseta-v1', 3, 1],
  ['ej-p-camiseta-v2', 0, 0],
  ['ej-p-bolsa-v0', 40, 15],
];

export const STOCK_EJEMPLO: FilaStock[] = UNIDADES.flatMap(([variante, p, f]) => [
  { variante, bodega: 'ej-b-principal', cantidad: p },
  { variante, bodega: 'ej-b-feria', cantidad: f },
]);

// ───────────── Ventas del POS ─────────────

/**
 * Las ventas en feria del ejemplo salen del POS: café y tazas a su costo real, y el resto como venta libre.
 * Devuelve los movimientos enlazados a su venta y las ventas (para el historial y el costo real, B5).
 */
export function ventasPosEjemplo(hoy: Fecha, movimientos: MovNegocio[]) {
  const feria = movimientos.filter((m) => m.concepto === 'ejemplo.textos.ventasFeria').sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cafe = PRODUCTOS_EJEMPLO[0];
  const taza = PRODUCTOS_EJEMPLO[1];
  const ventas = feria.map((m, i) => {
    const lineas: LineaVenta[] = [
      { variante: cafe.variantes[1].id, nombre: `${cafe.nombre}|500 g`, precio: cafe.precio, costo: cafe.costo, cantidad: 10, total: cafe.precio * 10 },
      { variante: taza.variantes[0].id, nombre: taza.nombre, precio: taza.precio, costo: taza.costo, cantidad: 5, total: taza.precio * 5 },
    ];
    const resto = m.monto - lineas.reduce((s, l) => s + l.total, 0);
    lineas.push({ variante: null, nombre: 'ejemplo.textos.otrasVentas', precio: resto, costo: null, cantidad: 1, total: resto });
    return {
      id: `ej-venta-${i}`,
      numero: i + 1,
      fecha: m.fecha,
      bodega: 'ej-b-feria',
      cliente: null,
      subtotal: m.monto,
      descuento: 0,
      total: m.monto,
      pagos: [{ nombre: 'ejemplo.textos.efectivo', cuenta: m.cuenta, monto: m.monto }],
      recibido: null,
      vuelto: null,
      iva: impuestoIncluido(m.monto, 19),
      tarifaIva: 19,
      ivaIncluido: true,
      estado: 'pagada' as const,
      creada: `${m.fecha}T15:00:00.000Z`,
      vendedor: null,
      codigo: null,
      lineas,
    };
  });
  const porMovimiento = new Map(feria.map((m, i) => [m.id, ventas[i].id]));
  return {
    movimientos: movimientos.map((m) => (porMovimiento.has(m.id) ? { ...m, venta: porMovimiento.get(m.id) } : m)),
    ventas: ventas.reverse(),
  };
}
