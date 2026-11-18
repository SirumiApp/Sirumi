import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { supabase } from '@/lib/supabase';
import { traducirErrorAuth, validarContrasena, validarCorreo, validarNombre } from '@/lib/validacion';
import { ESPACIO } from '@/theme';

export default function CrearCuentaPantalla() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errores = {
    nombre: validarNombre(nombre),
    correo: validarCorreo(correo),
    contrasena: validarContrasena(contrasena),
  };

  async function crear() {
    setIntentado(true);
    setError(null);
    if (errores.nombre || errores.correo || errores.contrasena) return;

    setCargando(true);
    const correoLimpio = correo.trim().toLowerCase();
    const { data, error: errorAuth } = await supabase.auth.signUp({
      email: correoLimpio,
      password: contrasena,
      options: { data: { full_name: nombre.trim() } },
    });
    setCargando(false);

    if (errorAuth) return setError(traducirErrorAuth(errorAuth));
    // Si el proyecto pide confirmar el correo, no hay sesión todavía.
    if (!data.session) router.replace({ pathname: '/confirmar-correo', params: { correo: correoLimpio } });
    // Si hay sesión, la navegación lleva sola a la app.
  }

  return (
    <Pantalla conEncabezado>
      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="titulo">Crea tu cuenta</Texto>
        <Texto variante="suave">Usamos estos datos para crear y proteger tu cuenta.</Texto>
      </View>

      <CampoTexto
        etiqueta="Nombre completo"
        value={nombre}
        onChangeText={setNombre}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        error={intentado ? errores.nombre : null}
      />
      <CampoTexto
        etiqueta="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        error={intentado ? errores.correo : null}
      />
      <CampoTexto
        etiqueta="Contraseña"
        value={contrasena}
        onChangeText={setContrasena}
        contrasena
        autoComplete="new-password"
        textContentType="newPassword"
        ayuda="Mínimo 8 caracteres."
        error={intentado ? errores.contrasena : null}
        returnKeyType="go"
        onSubmitEditing={crear}
      />

      {error && <Aviso mensaje={error} />}

      <Boton titulo="Crear mi cuenta" onPress={crear} cargando={cargando} />
      <Texto variante="pequeno" style={{ textAlign: 'center' }}>
        Sirumi es para mayores de 18 años.
      </Texto>
      <Boton titulo="Ya tengo cuenta" variante="texto" onPress={() => router.replace('/entrar')} />
    </Pantalla>
  );
}
