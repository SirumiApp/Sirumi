import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { usePerfil } from '@/auth/perfil';
import { cerrarSesion, useSesion } from '@/auth/sesion';
import { compartirArchivo, eliminarMiCuenta, misDatosCompletos } from '@/ajustes/archivos';
import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { enmascararDocumento } from '@/lib/exportar';
import { hoyEn } from '@/lib/fechas';
import { ESPACIO, useTema } from '@/theme';

/** Cuenta: datos de la persona, descargar sus datos, cerrar sesión y eliminar la cuenta (Ley 1581). */
export default function Cuenta() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const { sesion } = useSesion();
  const perfil = usePerfil();
  const [confirmando, setConfirmando] = useState(false);
  const [palabra, setPalabra] = useState('');
  const [ocupado, setOcupado] = useState<'descargar' | 'eliminar' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setOcupado('descargar');
    setError(null);
    try {
      const datos = await misDatosCompletos(sesion?.user.email);
      await compartirArchivo(`sirumi-mis-datos-${hoyEn()}.json`, JSON.stringify(datos, null, 2), 'application/json');
    } catch {
      setError(t('ajustes.errorExportar'));
    }
    setOcupado(null);
  }

  async function eliminar() {
    setOcupado('eliminar');
    setError(null);
    const { error: e } = await eliminarMiCuenta();
    setOcupado(null);
    if (e) setError(t('cuenta.errorEliminar'));
    // Si salió bien, la sesión se cierra y la app vuelve sola a la bienvenida.
  }

  const documento = enmascararDocumento(perfil?.document_number);
  const tipoDocumento = perfil?.document_type ? t(`documentos.${perfil.document_type as 'cc'}`, { defaultValue: perfil.document_type }) : '';

  return (
    <PantallaAjuste titulo={t('cuenta.titulo')}>
      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.seleccionado }}>
            <Emoji name="cara-sonriente" size={32} />
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="subtitulo">{perfil?.full_name ?? ''}</Texto>
            <Texto variante="suave">{sesion?.user.email}</Texto>
          </View>
        </View>
        <Texto variante="suave">{t('cuenta.celular', { celular: perfil?.phone ?? t('cuenta.sinDato') })}</Texto>
        <Texto variante="suave">{t('cuenta.documento', { documento: documento ? `${tipoDocumento} ${documento}`.trim() : t('cuenta.sinDato') })}</Texto>
      </Tarjeta>

      {error && <Aviso mensaje={error} />}

      <View style={{ gap: ESPACIO.s + 4 }}>
        <Boton titulo={t('cuenta.descargar')} variante="secundario" onPress={descargar} cargando={ocupado === 'descargar'} />
        <Texto variante="pequeno" style={{ textAlign: 'center' }}>
          {t('cuenta.descargarDetalle')}
        </Texto>
        <Boton titulo={t('cuenta.cerrarSesion')} variante="secundario" onPress={cerrarSesion} />
      </View>

      {!confirmando ? (
        <View style={{ gap: ESPACIO.s }}>
          <Boton titulo={t('cuenta.eliminar')} onPress={() => setConfirmando(true)} style={{ backgroundColor: colores.error }} />
          <Texto variante="pequeno" style={{ textAlign: 'center' }}>
            {t('cuenta.nota')}
          </Texto>
        </View>
      ) : (
        <View style={{ gap: ESPACIO.s + 4, padding: ESPACIO.l, borderRadius: 20, backgroundColor: colores.errorFondo }}>
          <Texto variante="subtitulo" color={colores.errorTexto}>
            {t('cuenta.confirmarTitulo')}
          </Texto>
          <Texto>{t('cuenta.confirmarDetalle')}</Texto>
          <CampoTexto etiqueta={t('cuenta.confirmarEscribe')} value={palabra} onChangeText={setPalabra} autoCapitalize="characters" autoCorrect={false} />
          <Boton
            titulo={t('cuenta.siEliminar')}
            disabled={palabra.trim().toUpperCase() !== t('cuenta.palabra')}
            cargando={ocupado === 'eliminar'}
            onPress={eliminar}
            style={{ backgroundColor: colores.error }}
          />
          <Boton
            titulo={t('movimiento.cancelar')}
            variante="texto"
            onPress={() => {
              setConfirmando(false);
              setPalabra('');
            }}
          />
        </View>
      )}
    </PantallaAjuste>
  );
}
