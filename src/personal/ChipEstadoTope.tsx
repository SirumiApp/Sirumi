import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Texto } from '@/components/Texto';
import type { EstadoDeTope } from '@/lib/analisis';
import { ESPACIO, FUENTES, useTema } from '@/theme';

/** Color de un tope según su estado (A3): rojo si se pasó, naranja si cuidado, azul si va bien. */
export function useColorEstadoTope() {
  const { colores } = useTema();
  return (e: EstadoDeTope) => (e.estado === 'superado' ? colores.error : e.estado === 'cuidado' ? colores.aviso : colores.accion);
}

/** Etiqueta del estado de un tope: "Superado", "Cuidado", "83%" o "Sin tope". La usan Inicio y Topes. */
export function ChipEstadoTope({ estado }: { estado: EstadoDeTope }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const color = useColorEstadoTope()(estado);
  const destacado = estado.estado === 'superado' || estado.estado === 'cuidado';
  return (
    <View style={{ paddingHorizontal: ESPACIO.s, paddingVertical: 2, borderRadius: 999, backgroundColor: colores.seleccionado }}>
      <Texto variante="pequeno" style={{ fontFamily: FUENTES.textoFuerte }} color={destacado ? color : colores.texto}>
        {t(`topes.estado.${estado.estado}`, { porcentaje: estado.porcentaje })}
      </Texto>
    </View>
  );
}
