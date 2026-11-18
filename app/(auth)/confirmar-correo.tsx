import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Emoji } from '@/components/emoji/Emoji';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { supabase } from '@/lib/supabase';
import { LARGO_MINIMO_CONTRASENA, traducirErrorAuth, validarCodigo } from '@/lib/validacion';
import { ESPACIO } from '@/theme';

export default function ConfirmarCorreoPantalla() {
  const { t } = useTranslation();
  const { correo = '' } = useLocalSearchParams<{ correo: string }>();
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'error' | 'info' } | null>(null);

  async function confirmar() {
    const errorCodigo = validarCodigo(codigo);
    if (errorCodigo) return setMensaje({ texto: t(`errores.${errorCodigo}`), tipo: 'error' });
    setCargando(true);
    const { error } = await supabase.auth.verifyOtp({ email: correo, token: codigo.trim(), type: 'email' });
    setCargando(false);
    if (error) setMensaje({ texto: t(`errores.${traducirErrorAuth(error)}`, { min: LARGO_MINIMO_CONTRASENA }), tipo: 'error' });
    // Si el código es correcto, queda la sesión abierta y la navegación lleva a la app.
  }

  async function reenviar() {
    const { error } = await supabase.auth.resend({ type: 'signup', email: correo });
    setMensaje(
      error
        ? { texto: t(`errores.${traducirErrorAuth(error)}`, { min: LARGO_MINIMO_CONTRASENA }), tipo: 'error' }
        : { texto: t('confirmar.reenviado'), tipo: 'info' },
    );
  }

  return (
    <Pantalla conEncabezado>
      <Tarjeta style={{ alignItems: 'center' }}>
        <Emoji name="sobre" size={64} />
        <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
          {t('confirmar.titulo')}
        </Texto>
        <Texto variante="suave" style={{ textAlign: 'center' }}>
          {t('confirmar.detalle', { correo: correo || t('confirmar.tuCorreo') })}
        </Texto>
      </Tarjeta>

      <CampoTexto
        etiqueta={t('confirmar.codigo')}
        value={codigo}
        onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="go"
        onSubmitEditing={confirmar}
      />

      {mensaje && <Aviso mensaje={mensaje.texto} tipo={mensaje.tipo} />}

      <View style={{ gap: ESPACIO.s }}>
        <Boton titulo={t('confirmar.confirmar')} onPress={confirmar} cargando={cargando} />
        <Boton titulo={t('confirmar.yaToque')} variante="secundario" onPress={() => router.replace('/entrar')} />
        <Boton titulo={t('confirmar.reenviar')} variante="texto" onPress={reenviar} />
      </View>
    </Pantalla>
  );
}
