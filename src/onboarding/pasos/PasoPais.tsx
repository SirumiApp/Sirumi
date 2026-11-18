import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Opcion } from '@/components/Opcion';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { ESPACIO } from '@/theme';

import { formatearMontoPais, PAISES, paisPorCodigo } from '../paises';
import { EncabezadoPaso, type PropsPaso } from './comun';

export function PasoPais({ d, cambiar }: PropsPaso) {
  const { t } = useTranslation();
  const pais = paisPorCodigo(d.pais);
  return (
    <>
      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="fuerte">{t('comun.idioma')}</Texto>
        <SelectorIdioma />
      </View>
      <EncabezadoPaso emoji="globo-terraqueo" titulo={t('onboarding.pais.titulo')} detalle={t('onboarding.pais.detalle')} />
      <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: ESPACIO.m }}>
        <Texto variante="suave">{t('onboarding.pais.montos')}</Texto>
        <Texto variante="subtitulo">{formatearMontoPais(1_250_000, pais)}</Texto>
      </Tarjeta>
      <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {PAISES.map((p) => (
          <Opcion
            key={p.codigo}
            izquierda={<Texto style={{ fontSize: 28, lineHeight: 34 }}>{p.bandera}</Texto>}
            titulo={t(`paises.${p.codigo}`)}
            derecha={p.moneda}
            elegida={d.pais === p.codigo}
            onPress={() => cambiar({ pais: p.codigo, tipoDocumento: 0 })}
          />
        ))}
      </View>
    </>
  );
}
