import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Texto } from '@/components/Texto';
import type { EstadoDeTope } from '@/lib/analisis';
import { ESPACIO, FUENTES, useTema } from '@/theme';

/** Color de la barra de un tope según su estado (A3): naranja oscuro si se pasó, amarillo si cuidado, azul si va bien. */
export function useColorEstadoTope() {
  const { colores } = useTema();
  return (e: EstadoDeTope) => (e.estado === 'superado' ? colores.error : e.estado === 'cuidado' ? colores.aviso : colores.accion);
}

/** Etiqueta del estado de un tope: "Superado", "Cuidado", "83%" o "Sin tope". La usan Inicio y Topes. */
export function ChipEstadoTope({ estado }: { estado: EstadoDeTope }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const [fondo, texto] =
    estado.estado === 'superado'
      ? [colores.errorFondo, colores.errorTexto]
      : estado.estado === 'cuidado'
        ? [colores.avisoFondo, colores.avisoTexto]
        : estado.estado === 'sinTope'
          ? [colores.relleno, colores.textoSuave]
          : [colores.seleccionado, colores.enlace];
  return (
    <View style={{ paddingHorizontal: ESPACIO.s + 2, paddingVertical: 4, borderRadius: 999, backgroundColor: fondo }}>
      <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={texto}>
        {t(`topes.estado.${estado.estado}`, { porcentaje: estado.porcentaje })}
      </Texto>
    </View>
  );
}
