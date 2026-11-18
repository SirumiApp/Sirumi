import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Texto } from '@/components/Texto';
import { LARGO_MINIMO_CONTRASENA, type CodigoError } from '@/lib/validacion';
import { ESPACIO } from '@/theme';

import { erroresDatosPersonales } from '../datos';
import { paisPorCodigo } from '../paises';
import { EncabezadoPaso, type PropsPaso } from './comun';

export function PasoDatos({ d, cambiar, intentado, conSesion }: PropsPaso & { conSesion: boolean }) {
  const { t } = useTranslation();
  const pais = paisPorCodigo(d.pais);
  const errores = intentado ? erroresDatosPersonales(d, { pideContrasena: !conSesion }) : {};
  const mensaje = (codigo?: CodigoError) => (codigo ? t(`errores.${codigo}`, { min: LARGO_MINIMO_CONTRASENA }) : null);

  return (
    <>
      <EncabezadoPaso emoji="persona" titulo={t('onboarding.datos.titulo')} detalle={t('onboarding.datos.detalle')} />
      <CampoTexto
        etiqueta={t('onboarding.datos.nombre')}
        value={d.nombre}
        onChangeText={(nombre) => cambiar({ nombre })}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        error={mensaje(errores.nombre)}
      />
      <CampoTexto
        etiqueta={t('onboarding.datos.correo')}
        value={d.correo}
        onChangeText={(correo) => cambiar({ correo })}
        editable={!conSesion}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        ayuda={conSesion ? t('onboarding.datos.correoAyuda') : undefined}
        error={mensaje(errores.correo)}
      />
      {!conSesion && (
        <CampoTexto
          etiqueta={t('onboarding.datos.contrasena')}
          value={d.contrasena}
          onChangeText={(contrasena) => cambiar({ contrasena })}
          contrasena
          autoComplete="new-password"
          textContentType="newPassword"
          ayuda={t('onboarding.datos.contrasenaAyuda')}
          error={mensaje(errores.contrasena)}
        />
      )}
      <CampoTexto
        etiqueta={t('onboarding.datos.celular', { prefijo: pais.prefijo })}
        value={d.celular}
        onChangeText={(celular) => cambiar({ celular: celular.replace(/[^\d ]/g, '') })}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="300 000 0000"
        error={mensaje(errores.celular)}
      />

      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="fuerte">
          {t('onboarding.datos.documento')} <Texto variante="suave">{t('comun.opcional')}</Texto>
        </Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
          {pais.documentos.map((codigo, i) => (
            <Chip key={codigo} texto={t(`documentos.${codigo}`)} elegido={d.tipoDocumento === i} onPress={() => cambiar({ tipoDocumento: i })} />
          ))}
        </View>
        <CampoTexto
          etiqueta={t('onboarding.datos.numero')}
          value={d.numeroDocumento}
          onChangeText={(numeroDocumento) => cambiar({ numeroDocumento })}
          autoCapitalize="characters"
          ayuda={t('onboarding.datos.numeroAyuda')}
        />
      </View>
    </>
  );
}
