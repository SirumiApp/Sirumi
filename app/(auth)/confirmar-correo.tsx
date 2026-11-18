import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Emoji } from '@/components/emoji/Emoji';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { supabase } from '@/lib/supabase';
import { traducirErrorAuth, validarCodigo } from '@/lib/validacion';
import { ESPACIO } from '@/theme';

export default function ConfirmarCorreoPantalla() {
  const { correo = '' } = useLocalSearchParams<{ correo: string }>();
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'error' | 'info' } | null>(null);

  async function confirmar() {
    const errorCodigo = validarCodigo(codigo);
    if (errorCodigo) return setMensaje({ texto: errorCodigo, tipo: 'error' });
    setCargando(true);
    const { error } = await supabase.auth.verifyOtp({ email: correo, token: codigo.trim(), type: 'email' });
    setCargando(false);
    if (error) setMensaje({ texto: traducirErrorAuth(error), tipo: 'error' });
    // Si el código es correcto, queda la sesión abierta y la navegación lleva a la app.
  }

  async function reenviar() {
    const { error } = await supabase.auth.resend({ type: 'signup', email: correo });
    setMensaje(error ? { texto: traducirErrorAuth(error), tipo: 'error' } : { texto: 'Te enviamos otro correo.', tipo: 'info' });
  }

  return (
    <Pantalla conEncabezado>
      <Tarjeta style={{ alignItems: 'center' }}>
        <Emoji name="sobre" size={64} />
        <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
          Revisa tu correo
        </Texto>
        <Texto variante="suave" style={{ textAlign: 'center' }}>
          Te enviamos un mensaje a {correo || 'tu correo'} para confirmar que es tuyo. Ábrelo y toca el enlace, o
          escribe aquí el código si te llegó uno.
        </Texto>
      </Tarjeta>

      <CampoTexto
        etiqueta="Código de 6 números"
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
        <Boton titulo="Confirmar" onPress={confirmar} cargando={cargando} />
        <Boton titulo="Ya toqué el enlace, quiero entrar" variante="secundario" onPress={() => router.replace('/entrar')} />
        <Boton titulo="Reenviar el correo" variante="texto" onPress={reenviar} />
      </View>
    </Pantalla>
  );
}
