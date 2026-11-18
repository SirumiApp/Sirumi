import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { ALTO_TOCABLE, ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

/** Una fila de informe: nombre, explicación corta y la cifra a la derecha. */
export function FilaCifra({ titulo, ayuda, valor, fuerte, color }: { titulo: string; ayuda?: string; valor: string; fuerte?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, minHeight: ALTO_TOCABLE, paddingVertical: ESPACIO.s }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante={fuerte ? 'fuerte' : 'medio'}>{titulo}</Texto>
        {ayuda ? <Texto variante="pequeno">{ayuda}</Texto> : null}
      </View>
      <Texto style={{ fontFamily: fuerte ? FUENTES.titulo : FUENTES.textoFuerte, fontSize: fuerte ? 18 : 16, lineHeight: fuerte ? 24 : 22 }} color={color}>
        {valor}
      </Texto>
    </View>
  );
}

/** Tarjeta blanca con filas separadas por una línea fina. */
export function ListaFilas({ titulo, children }: { titulo?: string; children: ReactNode[] }) {
  const { colores, oscuro } = useTema();
  const filas = children.filter(Boolean);
  return (
    <View style={{ gap: ESPACIO.s }}>
      {titulo ? <Texto variante="subtitulo">{titulo}</Texto> : null}
      <View style={[{ backgroundColor: colores.tarjeta, borderRadius: 20, paddingHorizontal: ESPACIO.m, paddingVertical: ESPACIO.xs }, sombraSuave(oscuro)]}>
        {filas.map((f, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={{ height: 1, backgroundColor: colores.borde }} />}
            {f}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

/** Botón redondo "Compartir" que manda el informe como texto (WhatsApp, correo, notas…). */
export function BotonCompartir({ texto }: { texto: () => string }) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => Share.share({ message: texto() })}
      style={({ pressed }) => [
        { minHeight: ALTO_TOCABLE, paddingHorizontal: ESPACIO.m, borderRadius: 999, justifyContent: 'center', backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.96 : 1 }] },
        sombraSuave(oscuro),
      ]}>
      <Texto variante="fuerte" color={colores.enlace}>
        {t('negocioApp.informes.compartir')}
      </Texto>
    </Pressable>
  );
}

/** Arma el texto de un informe para compartir: título, período y una línea por cifra. */
export function textoInforme(titulo: string, subtitulo: string, filas: [string, string][]): string {
  return [`${titulo} · ${subtitulo}`, '', ...filas.map(([a, b]) => `${a}: ${b}`), '', 'sirumi'].join('\n');
}

/** Monto redondeado, con "−" si es negativo. */
export function conSigno(plata: (v: number) => string, valor: number): string {
  const v = Math.round(valor);
  return v < 0 ? `−${plata(-v)}` : plata(v);
}
