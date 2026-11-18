import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { usePerfil } from '@/auth/perfil';
import { Aviso } from '@/components/Aviso';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Texto } from '@/components/Texto';
import { VistaDeudas, VistaMetas, VistaPatrimonio } from '@/personal/plan/Vistas';
import { usePlanPersonal } from '@/personal/planDatos';
import { ALTO_TOCABLE, FUENTES, RADIO, useTema } from '@/theme';

type Pestana = 'metas' | 'deudas' | 'patrimonio';
const PESTANAS: Pestana[] = ['metas', 'deudas', 'patrimonio'];

/** Mi plan: metas, deudas y patrimonio (docs/specs/02-personal.md, pantalla 5; reglas A5, A6 y A7). */
export default function Plan() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const perfil = usePerfil();
  const parametros = useLocalSearchParams<{ pestana?: string }>();
  const [pestana, setPestana] = useState<Pestana>(PESTANAS.includes(parametros.pestana as Pestana) ? (parametros.pestana as Pestana) : 'metas');
  const [version, setVersion] = useState(0);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const datos = usePlanPersonal(version);

  useEffect(() => {
    if (!mensaje) return;
    const temporizador = setTimeout(() => setMensaje(null), 2500);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  const alCambiar = (texto?: string) => {
    setVersion((v) => v + 1);
    if (texto) setMensaje(texto);
  };

  // Si en el onboarding eligió "ahorrar para algo puntual", se le sugiere crear esa meta.
  const planOnboarding = (perfil?.preferences as { plan?: { meta?: { nombre?: string; valor?: number } } } | null)?.plan?.meta;
  const metaSugerida = planOnboarding?.nombre && planOnboarding.valor ? { nombre: planOnboarding.nombre, valor: planOnboarding.valor } : null;

  return (
    <PantallaAjuste titulo={t('planPersonal.titulo')}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: colores.tarjeta }}>
        {PESTANAS.map((p) => {
          const activa = pestana === p;
          return (
            <Pressable
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              onPress={() => setPestana(p)}
              style={{ flex: 1, minHeight: ALTO_TOCABLE, alignItems: 'center', justifyContent: 'center', borderRadius: RADIO.l, backgroundColor: activa ? colores.accion : 'transparent' }}>
              <Texto style={{ fontFamily: FUENTES.textoFuerte }} color={activa ? colores.textoSobreAccion : colores.textoSuave}>
                {t(`planPersonal.pestanas.${p}`)}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      {mensaje && <Aviso mensaje={mensaje} tipo="info" />}

      {pestana === 'metas' && <VistaMetas metas={datos.metas} metaSugerida={metaSugerida} alCambiar={alCambiar} />}
      {pestana === 'deudas' && <VistaDeudas deudas={datos.deudas} alCambiar={alCambiar} />}
      {pestana === 'patrimonio' && (
        <VistaPatrimonio activos={datos.activos} metas={datos.metas} deudas={datos.deudas} fotos={datos.fotos} alCambiar={alCambiar} />
      )}
    </PantallaAjuste>
  );
}
