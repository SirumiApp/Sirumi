import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { Opcion } from '@/components/Opcion';
import { Texto } from '@/components/Texto';
import { supabase } from '@/lib/supabase';
import { ESPACIO, useTema } from '@/theme';

import type { Uso } from '../camino';
import { incluyeNegocio } from '../datos';
import { EncabezadoPaso, type PropsPaso } from './comun';

const USOS: { id: Uso; emoji: 'monedero' | 'tienda' | 'destellos' | 'apreton-de-manos' }[] = [
  { id: 'personal', emoji: 'monedero' },
  { id: 'negocio', emoji: 'tienda' },
  { id: 'ambos', emoji: 'destellos' },
  { id: 'vendedor', emoji: 'apreton-de-manos' },
];

export function PasoUso({ d, cambiar, intentado }: PropsPaso) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const [revisando, setRevisando] = useState(false);

  /** Revisa el código apenas tiene 6 letras y muestra a qué negocio pertenece. */
  async function cambiarCodigo(valor: string) {
    const codigo = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    cambiar({ codigo, negocioDelCodigo: null });
    if (codigo.length < 6) return;
    setRevisando(true);
    const { data } = await supabase.rpc('revisar_codigo', { codigo });
    setRevisando(false);
    cambiar({ codigo, negocioDelCodigo: typeof data === 'string' ? data : '' });
  }
  return (
    <>
      <EncabezadoPaso titulo={t('onboarding.uso.titulo')} detalle={t('onboarding.uso.detalle')} />
      <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {USOS.map((u) => (
          <Opcion
            key={u.id}
            emoji={u.emoji}
            titulo={t(`onboarding.uso.${u.id}.titulo`)}
            detalle={t(`onboarding.uso.${u.id}.detalle`)}
            elegida={d.uso === u.id}
            onPress={() => cambiar({ uso: u.id })}
          />
        ))}
      </View>
      {d.uso === 'vendedor' && (
        <View style={{ gap: ESPACIO.xs }}>
          <CampoTexto
            etiqueta={t('onboarding.uso.codigo')}
            ayuda={t('onboarding.uso.codigoAyuda')}
            value={d.codigo}
            onChangeText={cambiarCodigo}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            placeholder="K7P2QX"
            error={(intentado && !d.negocioDelCodigo) || d.negocioDelCodigo === '' ? t('errores.codigoInvalido') : null}
          />
          {revisando && <ActivityIndicator color={colores.accion} />}
          {!!d.negocioDelCodigo && (
            <Texto variante="fuerte" color={colores.ingresoTexto}>
              {t('onboarding.uso.vasAVender', { negocio: d.negocioDelCodigo })}
            </Texto>
          )}
        </View>
      )}
      {incluyeNegocio(d) && (
        <CampoTexto
          etiqueta={t('onboarding.uso.nombreNegocio')}
          value={d.negocio}
          onChangeText={(negocio) => cambiar({ negocio })}
          autoCapitalize="sentences"
          ayuda={t('onboarding.uso.nombreNegocioAyuda')}
        />
      )}
    </>
  );
}
