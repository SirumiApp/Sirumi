import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Texto } from '@/components/Texto';
import { useTributario } from '@/impuestos/ganchos';
import { useNegocio } from '@/negocio/contexto';
import { ESPACIO, useTema } from '@/theme';

/**
 * D6b · IVA de este producto: la tarifa general del negocio, la reducida (5% en Colombia, p. ej. el café) o exento.
 * Solo aparece si el negocio cobra IVA.
 */
export function SelectorIva({ valor, onCambio }: { valor: number | null; onCambio: (v: number | null) => void }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const { negocio } = useNegocio();
  const { tasaVentas, colombia, impuesto } = useTributario();
  if (!negocio?.configuracion.responsable_iva) return null;
  const nombre = t(`impuestosPais.nombres.${impuesto}`);
  const opciones: { valor: number | null; texto: string }[] = [
    { valor: null, texto: t('inventario.iva.general', { tasa: tasaVentas }) },
    ...(colombia ? [{ valor: 5, texto: '5%' }] : []),
    { valor: 0, texto: t('inventario.iva.exento') },
  ];
  return (
    <View style={{ gap: ESPACIO.s }}>
      <Texto variante="fuerte">{t('inventario.iva.titulo', { impuesto: nombre })}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {opciones.map((o) => (
          <Chip key={String(o.valor)} texto={o.texto} elegido={valor === o.valor} onPress={() => onCambio(o.valor)} />
        ))}
      </View>
      <Texto variante="pequeno" color={colores.textoSuave}>
        {t('inventario.iva.ayuda')}
      </Texto>
    </View>
  );
}
