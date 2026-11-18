import { View } from 'react-native';

import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import type { NombreEmoji } from '@/components/emoji/Emoji';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { ESPACIO, useTema } from '@/theme';

import { MESES_META, planDelOnboarding } from '../datos';
import { formatearMontoPais, paisPorCodigo } from '../paises';
import { EncabezadoPaso, type PropsPaso } from './comun';

export function PasoPlan({ d, cambiar, intentado }: PropsPaso) {
  const { colores } = useTema();
  const pais = paisPorCodigo(d.pais);
  const plata = (n: number) => formatearMontoPais(n, pais);
  const plan = planDelOnboarding(d);

  const errorIngreso = intentado && d.ingreso <= 0 ? plan.error : null;
  const errorMonto = intentado && d.ingreso > 0 ? plan.error : null;

  const info: Record<'ahorro' | 'deudas' | 'meta', { emoji: NombreEmoji; titulo: string; detalle: string; linea1: string; linea2: string }> = {
    ahorro: {
      emoji: 'alcancia',
      titulo: 'Tu plan de ahorro',
      detalle: 'Con lo que ganas y lo que quieres ahorrar, calculamos cuánto puedes gastar al mes.',
      linea1: `Si ganas ${plata(d.ingreso)} y ahorras ${plata(d.ahorro)}, lo máximo que puedes gastar al mes es:`,
      linea2: 'Registra tus gastos y te avisamos cuando te acerques al límite.',
    },
    deudas: {
      emoji: 'tarjeta',
      titulo: 'Tu plan para salir de deudas',
      detalle: 'Separamos primero lo que abonas a tus deudas y vemos cuánto te queda para vivir.',
      linea1: `Si ganas ${plata(d.ingreso)} y abonas ${plata(d.abono)} a tus deudas, te quedan para gastar:`,
      linea2: 'Luego registras tus deudas y te decimos a cuál pagarle primero.',
    },
    meta: {
      emoji: 'diana',
      titulo: 'Tu meta de ahorro',
      detalle: 'Cuéntanos la meta y calculamos cuánto separar cada mes.',
      linea1: `Para juntar ${plata(d.metaValor)} en ${d.metaMeses} meses necesitas separar ${plata(plan.separar)} al mes. Te quedan para gastar:`,
      linea2: 'Cada mes que cumplas, tu meta avanza.',
    },
  };
  const objetivo = d.objetivo === 'ver' ? 'ahorro' : d.objetivo;
  const textos = info[objetivo];

  return (
    <>
      <EncabezadoPaso emoji={textos.emoji} titulo={textos.titulo} detalle={textos.detalle} />

      <CampoDinero
        etiqueta="¿Cuánto ganas al mes? (en promedio)"
        valor={d.ingreso}
        onCambio={(ingreso) => cambiar({ ingreso })}
        separador={pais.separador}
        error={errorIngreso}
      />

      {objetivo === 'ahorro' && (
        <CampoDinero
          etiqueta="¿Cuánto quieres ahorrar al mes?"
          valor={d.ahorro}
          onCambio={(ahorro) => cambiar({ ahorro })}
          separador={pais.separador}
          error={errorMonto}
        />
      )}
      {objetivo === 'deudas' && (
        <CampoDinero
          etiqueta="¿Cuánto puedes abonar a tus deudas al mes?"
          valor={d.abono}
          onCambio={(abono) => cambiar({ abono })}
          separador={pais.separador}
          error={errorMonto}
        />
      )}
      {objetivo === 'meta' && (
        <>
          <CampoTexto
            etiqueta="¿Para qué es?"
            value={d.metaNombre}
            onChangeText={(metaNombre) => cambiar({ metaNombre })}
            placeholder="Viaje, moto, fondo de emergencia…"
            autoCapitalize="sentences"
          />
          <CampoDinero
            etiqueta="¿Cuánto necesitas juntar?"
            valor={d.metaValor}
            onCambio={(metaValor) => cambiar({ metaValor })}
            separador={pais.separador}
            error={errorMonto}
          />
          <View style={{ gap: ESPACIO.s }}>
            <Texto variante="fuerte">¿En cuántos meses?</Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
              {MESES_META.map((m) => (
                <Chip key={m} texto={`${m} meses`} elegido={d.metaMeses === m} onPress={() => cambiar({ metaMeses: m })} />
              ))}
            </View>
          </View>
        </>
      )}

      {!plan.error && (
        <Tarjeta style={{ borderColor: colores.marca, borderWidth: 2 }}>
          <Texto variante="pequeno" style={{ letterSpacing: 1 }}>
            TU PLAN
          </Texto>
          <Texto>{textos.linea1}</Texto>
          <Texto variante="cifra">
            {plata(plan.disponible)}
          </Texto>
          <Texto variante="suave">{textos.linea2}</Texto>
        </Tarjeta>
      )}
    </>
  );
}
