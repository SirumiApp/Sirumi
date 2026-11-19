import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Emoji } from '@/components/emoji/Emoji';
import { Texto } from '@/components/Texto';
import { ESPACIO, useTema } from '@/theme';

import { activarAvisos, estadoAvisos, type EstadoAvisos } from '.';

/** Invita a activar los avisos del celular (ventas y pagos). Se esconde cuando ya están activos o no se pueden. */
export function TarjetaAvisos({ siempre = false }: { siempre?: boolean }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);

  useEffect(() => {
    estadoAvisos().then(setEstado);
  }, []);

  if (!estado || (!siempre && (estado === 'activos' || estado === 'noDisponible'))) return null;

  return (
    <View style={{ flexDirection: 'row', gap: ESPACIO.m, alignItems: 'center', padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.seleccionado }}>
      <Emoji name="campana" size={36} />
      <View style={{ flex: 1, gap: ESPACIO.xs }}>
        <Texto variante="fuerte">{t(`notificaciones.estado.${estado}`)}</Texto>
        <Texto variante="pequeno">{t('notificaciones.queAvisa')}</Texto>
        {estado === 'preguntar' && <Boton titulo={t('notificaciones.activar')} onPress={async () => setEstado(await activarAvisos())} />}
        {estado === 'sinPermiso' && <Boton titulo={t('notificaciones.abrirAjustes')} variante="secundario" onPress={() => Linking.openSettings()} />}
      </View>
    </View>
  );
}
