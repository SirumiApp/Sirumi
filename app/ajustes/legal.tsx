import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { FilaAjuste } from '@/components/FilaAjuste';
import { GrupoAjustes, PantallaAjuste } from '@/components/PantallaAjuste';
import { Texto } from '@/components/Texto';
import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { ModalPolitica, type TipoPolitica } from '@/onboarding/pasos/ModalPolitica';
import { fechaCorta } from '@/personal/etiquetas';
import { useTextosFecha } from '@/personal/ganchos';
import { ESPACIO, FUENTES, useTema } from '@/theme';

type Autorizacion = Pick<Tables<'consents'>, 'id' | 'kind' | 'granted' | 'policy_version' | 'created_at'>;

/** Ajustes · Legal: políticas y la prueba de las autorizaciones (Ley 1581). */
export default function Legal() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const textosFecha = useTextosFecha();
  const [politica, setPolitica] = useState<TipoPolitica | null>(null);
  const [autorizaciones, setAutorizaciones] = useState<Autorizacion[]>([]);

  useEffect(() => {
    supabase
      .from('consents')
      .select('id, kind, granted, policy_version, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setAutorizaciones(data ?? []));
  }, []);

  // La más reciente de cada tipo es la que vale.
  const vigentes = ['terminos', 'datos', 'ia', 'novedades']
    .map((tipo) => autorizaciones.find((a) => a.kind === tipo))
    .filter((a): a is Autorizacion => !!a);

  return (
    <PantallaAjuste titulo={t('legal.titulo')} detalle={t('legal.detalle')}>
      <GrupoAjustes>
        <FilaAjuste emoji="pergamino" titulo={t('legal.tratamiento')} onPress={() => setPolitica('co')} />
        <FilaAjuste emoji="candado" titulo={t('legal.privacidad')} onPress={() => setPolitica('int')} />
        <FilaAjuste emoji="pagina" titulo={t('legal.terminos')} onPress={() => setPolitica('terminos')} />
        <FilaAjuste emoji="apreton-de-manos" titulo={t('legal.anexo')} onPress={() => setPolitica('anexo')} />
      </GrupoAjustes>

      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="subtitulo">{t('legal.autorizaciones')}</Texto>
        <Texto variante="suave">{t('legal.autorizacionesDetalle')}</Texto>
      </View>
      <GrupoAjustes>
        {vigentes.map((a) => (
          <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, paddingVertical: ESPACIO.s + 4 }}>
            <View style={{ flex: 1 }}>
              <Texto variante="fuerte">{t(`legal.tipos.${a.kind as 'terminos'}`)}</Texto>
              <Texto variante="pequeno">
                {t('legal.registro', { fecha: fechaCorta(a.created_at.slice(0, 10), textosFecha, true), version: a.policy_version })}
              </Texto>
            </View>
            <Texto style={{ fontFamily: FUENTES.textoFuerte }} color={a.granted ? colores.ingresoTexto : colores.textoSuave}>
              {a.granted ? t('legal.aceptada') : t('legal.rechazada')}
            </Texto>
          </View>
        ))}
      </GrupoAjustes>

      <ModalPolitica abierta={politica} onCerrar={() => setPolitica(null)} />
    </PantallaAjuste>
  );
}
