// B7 · Impuestos estimados (docs/reglas-de-calculo.md). Orientativos: no reemplazan al contador.
// Las tarifas y la UVT cambian cada año: llegan como parámetros (tabla tax_parameters, una fila por año).

export type GrupoActividad = 1 | 2 | 3 | 4;
export type RegimenTributario = 'simple' | 'ordinario' | 'natural';

export type ParametrosImpuestos = {
  uvt: number;
  /** Ventas al año (en UVT) desde las que se vuelve responsable de IVA y factura electrónica. */
  topeUvt: number;
  /** Límites de los rangos del SIMPLE por bimestre, en UVT: [1.000, 2.500, 5.000]. */
  rangosBimestreUvt: [number, number, number];
  /** Tarifa SIMPLE (%) por grupo de actividad y rango. */
  tarifasSimple: Record<GrupoActividad, [number, number, number, number]>;
  /** Tarifa del régimen ordinario sobre la utilidad (%). */
  tarifaOrdinario: number;
  /** Tabla del artículo 241 (persona natural), en UVT anuales. */
  tablaArt241: { desdeUvt: number; hastaUvt: number | null; tarifa: number; baseUvt: number }[];
  /** ICA por defecto (por mil de las ventas). Depende del municipio. */
  icaPorMil: number;
  iva: number;
  /** B12 · Ajustes al calendario de la DIAN (días cívicos, fechas movidas). */
  calendario?: import('./calendarioTributario').AjustesCalendario;
};

/** Impuesto de renta de persona natural (art. 241) para una renta anual en UVT. Devuelve UVT. */
function art241(rentaUvt: number, tabla: ParametrosImpuestos['tablaArt241']): number {
  const tramo = tabla.find((t) => rentaUvt > t.desdeUvt && (t.hastaUvt === null || rentaUvt <= t.hastaUvt));
  if (!tramo) return 0;
  return (rentaUvt - tramo.desdeUvt) * (tramo.tarifa / 100) + tramo.baseUvt;
}

/**
 * B7 · Estimación de los tres regímenes para el período:
 * - SIMPLE = ventas × tarifa (según grupo y ventas del bimestre en UVT; incluye el ICA).
 * - Ordinario = 35% de la utilidad operativa (si es positiva) + ICA.
 * - Persona natural = art. 241 sobre la utilidad anualizada en UVT, devuelto al período, + ICA.
 */
export function impuestosEstimados(
  d: { ventas: number; operativa: number; diasPeriodo: number; grupo: GrupoActividad; icaPorMil?: number },
  p: ParametrosImpuestos,
) {
  const factorMes = 30 / Math.max(1, d.diasPeriodo);
  const uvtBimestre = (d.ventas * factorMes * 2) / p.uvt;
  const [r1, r2, r3] = p.rangosBimestreUvt;
  const rango = uvtBimestre < r1 ? 0 : uvtBimestre < r2 ? 1 : uvtBimestre < r3 ? 2 : 3;
  const tarifaSimple = p.tarifasSimple[d.grupo][rango];
  const simple = (d.ventas * tarifaSimple) / 100;
  const ica = (d.ventas * (d.icaPorMil ?? p.icaPorMil)) / 1000;
  const utilidad = Math.max(0, d.operativa);
  const ordinario = (utilidad * p.tarifaOrdinario) / 100 + ica;
  const mesesAnio = factorMes * 12;
  const natural = (art241((utilidad * mesesAnio) / p.uvt, p.tablaArt241) * p.uvt) / mesesAnio + ica;
  const opciones: [RegimenTributario, number][] = [
    ['simple', simple],
    ['ordinario', ordinario],
    ['natural', natural],
  ];
  const masBajo = opciones.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  const ventasAnio = d.ventas * mesesAnio;
  return {
    uvtBimestre,
    tarifaSimple,
    simple,
    ica,
    ordinario,
    natural,
    masBajo,
    ventasAnio,
    superaTope: ventasAnio > p.topeUvt * p.uvt,
  };
}

/** Lo que corresponde según el régimen del negocio (si no lo eligió, SIMPLE). */
export function impuestoDelRegimen(r: ReturnType<typeof impuestosEstimados>, regimen: RegimenTributario | null): number {
  return regimen === 'ordinario' ? r.ordinario : regimen === 'natural' ? r.natural : r.simple;
}

/** B7 · Si el negocio es responsable de IVA, la venta se registra por su base: total / 1,19. */
export function baseSinIva(total: number, iva: number): number {
  return Math.round(total / (1 + iva / 100));
}
