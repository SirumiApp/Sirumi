import { View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Texto } from '@/components/Texto';
import { ESPACIO } from '@/theme';

import { erroresDatosPersonales } from '../datos';
import { paisPorCodigo } from '../paises';
import { EncabezadoPaso, type PropsPaso } from './comun';

export function PasoDatos({ d, cambiar, intentado, conSesion }: PropsPaso & { conSesion: boolean }) {
  const pais = paisPorCodigo(d.pais);
  const errores = intentado ? erroresDatosPersonales(d, { pideContrasena: !conSesion }) : {};

  return (
    <>
      <EncabezadoPaso emoji="persona" titulo="Cuéntanos de ti" detalle="Usamos estos datos para crear y proteger tu cuenta." />
      <CampoTexto
        etiqueta="Nombre completo"
        value={d.nombre}
        onChangeText={(nombre) => cambiar({ nombre })}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        error={errores.nombre}
      />
      <CampoTexto
        etiqueta="Correo electrónico"
        value={d.correo}
        onChangeText={(correo) => cambiar({ correo })}
        editable={!conSesion}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        ayuda={conSesion ? 'Es el correo de tu cuenta.' : undefined}
        error={errores.correo}
      />
      {!conSesion && (
        <CampoTexto
          etiqueta="Crea una contraseña"
          value={d.contrasena}
          onChangeText={(contrasena) => cambiar({ contrasena })}
          contrasena
          autoComplete="new-password"
          textContentType="newPassword"
          ayuda="Mínimo 8 caracteres."
          error={errores.contrasena}
        />
      )}
      <CampoTexto
        etiqueta={`Celular (${pais.prefijo})`}
        value={d.celular}
        onChangeText={(celular) => cambiar({ celular: celular.replace(/[^\d ]/g, '') })}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="300 000 0000"
        error={errores.celular}
      />

      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="fuerte">
          Documento de identidad <Texto variante="suave">(opcional)</Texto>
        </Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
          {pais.documentos.map((nombre, i) => (
            <Chip key={nombre} texto={nombre} elegido={d.tipoDocumento === i} onPress={() => cambiar({ tipoDocumento: i })} />
          ))}
        </View>
        <CampoTexto
          etiqueta="Número de documento"
          value={d.numeroDocumento}
          onChangeText={(numeroDocumento) => cambiar({ numeroDocumento })}
          autoCapitalize="characters"
          ayuda="Solo lo pedimos para facturar desde el módulo de negocios. Puedes dejarlo vacío por ahora."
        />
      </View>
    </>
  );
}
