import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { useNegocio } from '@/negocio/contexto';
import { leerErrorInventario } from '@/negocio/inventarioDatos';
import { unirseConCodigo } from '@/negocio/vendedoresDatos';
import { supabase } from '@/lib/supabase';

/** Unirse con un código a vender en el negocio de alguien (para quien ya tiene cuenta). */
export default function Unirme() {
  const { t } = useTranslation();
  const { actualizar } = useNegocio();
  const [codigo, setCodigo] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'info' | 'error' } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function unirme() {
    setCargando(true);
    const { data: negocio } = await supabase.rpc('revisar_codigo', { codigo });
    const { error } = await unirseConCodigo(codigo);
    setCargando(false);
    const err = leerErrorInventario(error);
    if (err) return setAviso({ texto: err.codigo === 'yaEresMiembro' ? t('errores.yaEresMiembro') : t('errores.codigoInvalido'), tipo: 'error' });
    setAviso({ texto: t('vendedores.unido', { negocio: negocio ?? '' }), tipo: 'info' });
    actualizar();
    setTimeout(() => router.replace('/negocio'), 1200);
  }

  return (
    <PantallaAjuste titulo={t('vendedores.unirme')} detalle={t('vendedores.unirmeDetalle')}>
      <CampoTexto
        etiqueta={t('onboarding.uso.codigo')}
        ayuda={t('onboarding.uso.codigoAyuda')}
        value={codigo}
        onChangeText={(v) => setCodigo(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        placeholder="K7P2QX"
      />
      {aviso && <Aviso mensaje={aviso.texto} tipo={aviso.tipo} />}
      <Boton titulo={t('vendedores.unirmeBoton')} onPress={unirme} cargando={cargando} disabled={codigo.length < 6} />
    </PantallaAjuste>
  );
}
