import { View } from 'react-native';

import { Opcion } from '@/components/Opcion';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { ESPACIO } from '@/theme';

import { formatearMontoPais, PAISES, paisPorCodigo } from '../paises';
import { EncabezadoPaso, type PropsPaso } from './comun';

export function PasoPais({ d, cambiar }: PropsPaso) {
  const pais = paisPorCodigo(d.pais);
  return (
    <>
      <EncabezadoPaso
        emoji="globo-terraqueo"
        titulo="¿Desde dónde usas la app?"
        detalle="Con tu país ajustamos la moneda y el formato de tus montos. Podrás cambiarlo cuando quieras en Ajustes."
      />
      <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: ESPACIO.m }}>
        <Texto variante="suave">Así verás tus montos:</Texto>
        <Texto variante="subtitulo">{formatearMontoPais(1_250_000, pais)}</Texto>
      </Tarjeta>
      <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {PAISES.map((p) => (
          <Opcion
            key={p.codigo}
            izquierda={<Texto style={{ fontSize: 28, lineHeight: 34 }}>{p.bandera}</Texto>}
            titulo={p.nombre}
            derecha={p.moneda}
            elegida={d.pais === p.codigo}
            onPress={() => cambiar({ pais: p.codigo, tipoDocumento: 0 })}
          />
        ))}
      </View>
    </>
  );
}
