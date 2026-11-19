import { describe, expect, it } from '@jest/globals';
import { strToU8, zipSync } from 'fflate';

import { leerExtracto } from './extractos';
import { leerXlsx } from './xlsx';

/** Un .xlsx de verdad, armado en memoria (como lo guarda Excel). */
function excel(hoja: string, compartidos: string[]) {
  return zipSync({
    'xl/workbook.xml': strToU8('<workbook><sheets><sheet name="Extracto" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/sharedStrings.xml': strToU8(`<sst>${compartidos.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`),
    'xl/worksheets/sheet1.xml': strToU8(`<worksheet><sheetData>${hoja}</sheetData></worksheet>`),
  });
}

describe('leer Excel (.xlsx)', () => {
  const bytes = excel(
    '<row r="1"><c r="A1" t="s"><v>0</v></c></row>' +
      '<row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3" t="s"><v>2</v></c><c r="D3" t="s"><v>3</v></c></row>' +
      '<row r="4"><c r="A4"><v>46249</v></c><c r="B4" t="inlineStr"><is><t>Pago &amp; arriendo</t></is></c><c r="D4"><v>-1300000</v></c></row>',
    ['DAVIVIENDA', 'Fecha', 'Descripción', 'Valor'],
  );
  it('textos compartidos, en línea, números, celdas vacías y entidades', () => {
    const filas = leerXlsx(bytes);
    expect(filas[0]).toEqual(['DAVIVIENDA']);
    expect(filas[2]).toEqual(['Fecha', 'Descripción', '', 'Valor']);
    expect(filas[3]).toEqual([46249, 'Pago & arriendo', '', -1300000]);
  });
  it('de punta a punta: el extracto en Excel se lee igual que en CSV', () => {
    expect(leerExtracto(leerXlsx(bytes)).movimientos).toEqual([{ fila: 4, fecha: '2026-08-15', descripcion: 'Pago & arriendo', monto: -1_300_000 }]);
  });
  it('un archivo que no es Excel avisa', () => {
    expect(() => leerXlsx(strToU8('no soy un excel'))).toThrow('noEsExcel');
  });
});
