import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { supabase } from '@/lib/supabase';
import { traducirErrorAuth, validarCorreo } from '@/lib/validacion';
import { ESPACIO } from '@/theme';

export default function EntrarPantalla() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorCorreo = validarCorreo(correo);
  const errorContrasena = contrasena ? null : 'Escribe tu contraseña.';

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
        <Texto variante="titulo">¡Hola de nuevo!</Texto>
        <Texto variante="suave">Entra con tu correo y tu contraseña.</Texto>
      </View>

      <CampoTexto
        etiqueta="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        error={intentado ? errorCorreo : null}
      />
      <CampoTexto
        etiqueta="Contraseña"
        value={contrasena}
        onChangeText={setContrasena}
        contrasena
        autoComplete="current-password"
        textContentType="password"
        error={intentado ? errorContrasena : null}
        returnKeyType="go"
        onSubmitEditing={entrar}
      />

      {error && <Aviso mensaje={error} />}

      <Boton titulo="Entrar" onPress={entrar} cargando={cargando} />
      <Boton titulo="Crear una cuenta nueva" variante="texto" onPress={() => router.push('/onboarding')} />
    </Pantalla>
  );
}
