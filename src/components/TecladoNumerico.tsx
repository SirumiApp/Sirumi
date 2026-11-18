import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { ALTO_TOCABLE, ESPACIO, FUENTES, RADIO, useTema } from '@/theme';

import { Texto } from './Texto';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'borrar'] as const;
const MAXIMO_DIGITOS = 10;

/** Aplica una tecla al monto (solo dígitos). Exportada para probarla. */
export function aplicarTecla(actual: string, tecla: (typeof TECLAS)[number]): string {
  if (tecla === 'borrar') return actual.slice(0, -1);
  if (actual === '' && (tecla === '0' || tecla === '000')) return actual;
  return (actual + tecla).slice(0, MAXIMO_DIGITOS);
}

/** Teclado para escribir plata, con botón 000. */
export function TecladoNumerico({ valor, onCambio, compacto = false }: { valor: string; onCambio: (valor: string) => void; compacto?: boolean }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compacto ? 6 : ESPACIO.s }}>
      {TECLAS.map((tecla) => (
        <Pressable
          key={tecla}
          accessibilityRole="button"
          accessibilityLabel={tecla === 'borrar' ? t('movimiento.borrarTecla') : tecla}
          onPress={() => onCambio(aplicarTecla(valor, tecla))}
          style={({ pressed }) => ({
            width: '31.5%',
            minHeight: compacto ? ALTO_TOCABLE + 4 : ALTO_TOCABLE + 8,
            borderRadius: RADIO.l,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colores.seleccionado : colores.relleno,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}>
          <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 22 }}>{tecla === 'borrar' ? '⌫' : tecla}</Texto>
        </Pressable>
      ))}
    </View>
  );
}
