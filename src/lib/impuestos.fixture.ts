// Parámetros 2026 usados en las pruebas (iguales a la fila 2026 de la tabla tax_parameters).
import type { ParametrosImpuestos } from './impuestos';

export const P2026: ParametrosImpuestos = {
  uvt: 52_374,
  topeUvt: 3_500,
  rangosBimestreUvt: [1_000, 2_500, 5_000],
  tarifasSimple: { 1: [1.2, 2.8, 4.4, 5.6], 2: [1.6, 2.0, 3.5, 4.5], 3: [7.3, 8.3, 8.3, 8.3], 4: [3.1, 3.4, 4.0, 4.5] },
  tarifaOrdinario: 35,
  tablaArt241: [
    { desdeUvt: 0, hastaUvt: 1_090, tarifa: 0, baseUvt: 0 },
    { desdeUvt: 1_090, hastaUvt: 1_700, tarifa: 19, baseUvt: 0 },
    { desdeUvt: 1_700, hastaUvt: 4_100, tarifa: 28, baseUvt: 116 },
    { desdeUvt: 4_100, hastaUvt: 8_670, tarifa: 33, baseUvt: 788 },
    { desdeUvt: 8_670, hastaUvt: 18_970, tarifa: 35, baseUvt: 2_296 },
    { desdeUvt: 18_970, hastaUvt: 31_000, tarifa: 37, baseUvt: 5_901 },
    { desdeUvt: 31_000, hastaUvt: null, tarifa: 39, baseUvt: 10_352 },
  ],
  icaPorMil: 9.66,
  iva: 19,
};
