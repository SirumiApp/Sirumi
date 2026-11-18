import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { supabase } from '@/lib/supabase';
import { LARGO_MINIMO_CONTRASENA, traducirErrorAuth, validarCorreo, type CodigoError } from '@/lib/validacion';
import { ESPACIO } from '@/theme';

export default function EntrarPantalla() {
  const { t } = useTranslation();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<CodigoError | null>(null);
  const mensaje = (codigo: CodigoError | null) => (codigo ? t(`errores.${codigo}`, { min: LARGO_MINIMO_CONTRASENA }) : null);

  const errorCorreo = validarCorreo(correo);
  const errorContrasena: CodigoError | null = contrasena ? null : 'contrasenaVacia';

  async function entrar() {
    setIntentado(true);
    setError(null);
    if (errorCorreo || errorContrasena) return;

    setCargando(true);
    const correoLimpio = correo.trim().toLowerCase();
    const { error: errorAuth } = await supabase.auth.signInWithPassword({ email: correoLimpio, password: contrasena });
    setCargando(false);

    if (errorAuth?.code === 'email_not_confirmed') {
      return router.push({ pathname: '/confirmar-correo', params: { correo: correoLimpio } });
    }
    if (errorAuth) setError(traducirErrorAuth(errorAuth));
    // Si entró, la navegación lleva sola a la app.
  }

  return (
    <Pantalla conEncabezado>
      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="titulo">{t('entrar.titulo')}</Texto>
        <Texto variante="suave">{t('entrar.detalle')}</Texto>
      </View>

      <CampoTexto
        etiqueta={t('entrar.correo')}
        value={correo}
        onChangeText={setCorreo}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        error={intentado ? mensaje(errorCorreo) : null}
      />
      <CampoTexto
        etiqueta={t('entrar.contrasena')}
        value={contrasena}
        onChangeText={setContrasena}
        contrasena
        autoComplete="current-password"
        textContentType="password"
        error={intentado ? mensaje(errorContrasena) : null}
        returnKeyType="go"
        onSubmitEditing={entrar}
      />

      {error && <Aviso mensaje={mensaje(error) ?? ''} />}

      <Boton titulo={t('entrar.entrar')} onPress={entrar} cargando={cargando} />
      <Boton titulo={t('entrar.crearNueva')} variante="texto" onPress={() => router.push('/onboarding')} />
    </Pantalla>
  );
}
