import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PantallaAjuste } from '@/components/PantallaAjuste';
import { DetalleProducto } from '@/inventario/DetalleProducto';
import { NuevoProducto } from '@/inventario/NuevoProducto';
import { useNegocio } from '@/negocio/contexto';

/** Nuevo producto (id = "nuevo") o el detalle de uno (spec 04, §3 y §4). */
export default function PantallaProducto() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { productos } = useNegocio();
  if (id === 'nuevo') return <NuevoProducto />;
  const producto = productos.find((p) => p.id === id);
  if (!producto) return <PantallaAjuste titulo={t('inventario.titulo')}>{null}</PantallaAjuste>;
  return <DetalleProducto key={producto.id} producto={producto} />;
}
