import { View } from 'react-native';

import { Emoji } from '@/components/emoji/Emoji';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { ESPACIO, useTema } from '@/theme';

import { incluyeNegocio, incluyePersonal, planDelOnboarding } from '../datos';
import { formatearMontoPais, paisPorCodigo } from '../paises';
import type { PropsPaso } from './comun';

const NOMBRES_USO = { personal: 'Finanzas personales', negocio: 'Mi negocio', ambos: 'Personal y negocio' };

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const { colores } = useTema();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: ESPACIO.m,
        paddingVertical: ESPACIO.s,
        borderBottomWidth: 1,
        borderBottomColor: colores.borde,
      }}>
      <Texto variante="suave">{etiqueta}</Texto>
      <Texto variante="fuerte" style={{ flexShrink: 1, textAlign: 'right' }}>
        {valor}
      </Texto>
    </View>
  );
}

export function PasoListo({ d }: Pick<PropsPaso, 'd'>) {
  const pais = paisPorCodigo(d.pais);
  const conPlan = incluyePersonal(d) && d.objetivo !== 'ver';
  const plan = planDelOnboarding(d);

  return (
    <>
      <View style={{ alignItems: 'center', gap: ESPACIO.s, paddingTop: ESPACIO.l }}>
        <Emoji name="confeti" size={96} />
        <Texto variante="titulo" accessibilityRole="header">
          ¡Todo listo!
        </Texto>
        <Texto variante="suave">Tu cuenta quedó configurada.</Texto>
      </View>
      <Tarjeta style={{ gap: 0 }}>
        <Fila etiqueta="País" valor={`${pais.bandera} ${pais.nombre}`} />
        <Fila etiqueta="Moneda" valor={pais.moneda} />
        <Fila etiqueta="Uso" valor={NOMBRES_USO[d.uso]} />
        {incluyeNegocio(d) && <Fila etiqueta="Negocio" valor={d.negocio.trim() || 'Mi negocio'} />}
        {conPlan && (
          <Fila
            etiqueta={d.objetivo === 'ahorro' ? 'Gasto máximo al mes' : 'Te queda para gastar'}
            valor={formatearMontoPais(plan.disponible, pais)}
          />
        )}
      </Tarjeta>
    </>
  );
}
