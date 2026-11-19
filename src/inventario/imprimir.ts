import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { htmlEtiquetas, type Etiqueta } from '@/lib/etiquetas';

/** C11 · Arma el PDF de etiquetas y abre el menú para imprimir o compartir (en el navegador, el diálogo de imprimir). */
export async function imprimirEtiquetas(etiquetas: Etiqueta[], negocio: string) {
  const html = htmlEtiquetas(etiquetas.slice(0, 300), negocio);
  if (Platform.OS === 'web') return Print.printAsync({ html });
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Etiquetas' });
}
