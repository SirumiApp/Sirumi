import { View } from 'react-native';

import type { NombreEmoji } from '@/components/emoji/Emoji';
import { Opcion } from '@/components/Opcion';
import type { Objetivo } from '@/lib/plan';
import { ESPACIO } from '@/theme';

import { EncabezadoPaso, type PropsPaso } from './comun';

const OBJETIVOS: { id: Objetivo; emoji: NombreEmoji; titulo: string; detalle: string }[] = [
  { id: 'ver', emoji: 'ojos', titulo: 'Solo ver en qué gasto', detalle: 'Registro mis gastos y listo. Sin metas ni presión.' },
  { id: 'ahorro', emoji: 'alcancia', titulo: 'Ahorrar una cantidad cada mes', detalle: 'Te digo cuánto puedes gastar como máximo.' },
  { id: 'meta', emoji: 'diana', titulo: 'Ahorrar para algo puntual', detalle: 'Viaje, moto, fondo de emergencia: calculo cuánto separar al mes.' },
  { id: 'deudas', emoji: 'tarjeta', titulo: 'Salir de deudas', detalle: 'Ordeno tus pagos y te digo cuánto abonar.' },
];

export function PasoObjetivo({ d, cambiar }: PropsPaso) {
  return (
    <>
      <EncabezadoPaso
        titulo={d.uso === 'ambos' ? '¿Qué quieres lograr con tu cuenta personal?' : '¿Qué quieres lograr con tu plata?'}
        detalle="Elige lo principal. Armamos la app alrededor de eso y lo puedes cambiar cuando quieras."
      />
      <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {OBJETIVOS.map((o) => (
          <Opcion
            key={o.id}
            emoji={o.emoji}
            titulo={o.titulo}
            detalle={o.detalle}
            elegida={d.objetivo === o.id}
            onPress={() => cambiar({ objetivo: o.id })}
          />
        ))}
      </View>
    </>
  );
}
