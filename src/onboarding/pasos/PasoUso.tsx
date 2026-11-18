import { View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { Opcion } from '@/components/Opcion';
import { ESPACIO } from '@/theme';

import type { Uso } from '../camino';
import { incluyeNegocio } from '../datos';
import { EncabezadoPaso, type PropsPaso } from './comun';

const USOS: { id: Uso; emoji: 'monedero' | 'tienda' | 'destellos'; titulo: string; detalle: string }[] = [
  { id: 'personal', emoji: 'monedero', titulo: 'Mis finanzas personales', detalle: 'Gastos, ingresos, topes y análisis del mes.' },
  { id: 'negocio', emoji: 'tienda', titulo: 'Mi negocio o emprendimiento', detalle: 'Ventas, costos y si estás ganando o perdiendo.' },
  { id: 'ambos', emoji: 'destellos', titulo: 'Las dos cosas', detalle: 'Un solo lugar para tu plata y la del negocio.' },
];

export function PasoUso({ d, cambiar }: PropsPaso) {
  return (
    <>
      <EncabezadoPaso
        titulo="¿Para qué usarás Sirumi?"
        detalle="La app tiene dos módulos. Activa el que necesites y cambia cuando quieras."
      />
      <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {USOS.map((u) => (
          <Opcion
            key={u.id}
            emoji={u.emoji}
            titulo={u.titulo}
            detalle={u.detalle}
            elegida={d.uso === u.id}
            onPress={() => cambiar({ uso: u.id })}
          />
        ))}
      </View>
      {incluyeNegocio(d) && (
        <CampoTexto
          etiqueta="¿Cómo se llama tu negocio? (opcional)"
          value={d.negocio}
          onChangeText={(negocio) => cambiar({ negocio })}
          autoCapitalize="sentences"
          ayuda="Saldrá arriba en tu módulo de negocio. Lo puedes cambiar después."
        />
      )}
    </>
  );
}
