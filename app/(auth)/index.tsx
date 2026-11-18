import { router } from 'expo-router';
import { View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { ESPACIO, FUENTES } from '@/theme';

export default function BienvenidaPantalla() {
  return (
    <Pantalla>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: ESPACIO.m, paddingVertical: ESPACIO.xl }}>
        <Emoji name="cohete" size={140} />
        <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 44, lineHeight: 52 }}>sirumi</Texto>
        <Texto variante="subtitulo">Tu plata, hacia arriba.</Texto>
        <Texto variante="suave" style={{ textAlign: 'center', maxWidth: 300 }}>
          Tu plata personal y la de tu negocio, en un solo lugar.
        </Texto>
      </View>
      <View style={{ gap: ESPACIO.s }}>
        <Boton titulo="Crear mi cuenta" onPress={() => router.push('/crear-cuenta')} />
        <Boton titulo="Ya tengo cuenta" variante="secundario" onPress={() => router.push('/entrar')} />
      </View>
    </Pantalla>
  );
}
