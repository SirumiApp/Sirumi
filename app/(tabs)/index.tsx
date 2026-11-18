import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { primerNombre, usePerfil } from '@/auth/perfil';
import { cerrarSesion } from '@/auth/sesion';
import { Boton } from '@/components/Boton';
import { PantallaVacia } from '@/components/PantallaVacia';
import { ESPACIO } from '@/theme';

export default function PersonalPantalla() {
  const { t } = useTranslation();
  const perfil = usePerfil();
  const nombre = primerNombre(perfil?.full_name);

  return (
    <PantallaVacia
      saludo={nombre ? t('personal.saludoNombre', { nombre }) : t('personal.saludo')}
      titulo={t('personal.titulo')}
      emoji="bolsa-de-dinero"
      mensaje={t('personal.mensaje')}
      detalle={t('personal.detalle')}>
      {/* Mientras no exista la pantalla de Ajustes, cerrar sesión vive aquí. */}
      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: ESPACIO.s }}>
        <Boton titulo={t('comun.cerrarSesion')} variante="texto" onPress={cerrarSesion} />
      </View>
    </PantallaVacia>
  );
}
