import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useSesion } from '@/auth/sesion';
import { cambiarIdioma, IDIOMAS, idiomaActual, type Idioma } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { ESPACIO } from '@/theme';

import { Chip } from './Chip';

/** Botones para cambiar el idioma de la app. Si hay sesión, el idioma queda guardado en el perfil. */
export function SelectorIdioma() {
  const { t, i18n } = useTranslation();
  const { sesion } = useSesion();
  const actual = esActual(i18n.language) ? i18n.language : idiomaActual();

  async function elegir(idioma: Idioma) {
    await cambiarIdioma(idioma);
    if (sesion) await supabase.from('profiles').update({ language: idioma }).eq('id', sesion.user.id);
  }

  return (
    <View
      style={{ flexDirection: 'row', gap: ESPACIO.s, alignItems: 'center' }}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('comun.idioma')}>
      {IDIOMAS.map((i) => (
        <Chip key={i.codigo} texto={i.nombre} elegido={actual === i.codigo} onPress={() => elegir(i.codigo)} />
      ))}
    </View>
  );
}

function esActual(valor: string): valor is Idioma {
  return IDIOMAS.some((i) => i.codigo === valor);
}
