import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type ScrollViewInstance } from 'react-native';

import { cerrarSesion, guardarOnboardingPendiente, useSesion } from '@/auth/sesion';
import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Pantalla } from '@/components/Pantalla';
import { PuntosProgreso } from '@/components/PuntosProgreso';
import { Texto } from '@/components/Texto';
import { supabase } from '@/lib/supabase';
import { idiomaActual } from '@/i18n';
import { LARGO_MINIMO_CONTRASENA, traducirErrorAuth } from '@/lib/validacion';
import { caminoDePasos, pasoAnterior, pasoSiguiente, type Paso } from '@/onboarding/camino';
import { DATOS_INICIALES, erroresDatosPersonales, paraGuardar, planDelOnboarding, type DatosOnboarding } from '@/onboarding/datos';
import { PasoDatos } from '@/onboarding/pasos/PasoDatos';
import { PasoListo } from '@/onboarding/pasos/PasoListo';
import { PasoObjetivo } from '@/onboarding/pasos/PasoObjetivo';
import { PasoPais } from '@/onboarding/pasos/PasoPais';
import { PasoPlan } from '@/onboarding/pasos/PasoPlan';
import { faltanObligatorias, PasoPrivacidad } from '@/onboarding/pasos/PasoPrivacidad';
import { PasoUso } from '@/onboarding/pasos/PasoUso';
import { VERSION_POLITICA } from '@/onboarding/politica';
import { ALTO_TOCABLE, ESPACIO, FUENTES } from '@/theme';

/**
 * Onboarding (docs/specs/01-onboarding.md).
 * Sin sesión: crea la cuenta en el paso de privacidad. Con sesión (cuenta creada antes): solo completa los datos.
 */
export default function OnboardingPantalla() {
  const { t } = useTranslation();
  const { sesion, setEnOnboarding, marcarOnboardingListo } = useSesion();
  // Se decide al entrar: si la cuenta se crea aquí mismo, la sesión aparece a mitad del camino.
  const [conSesion] = useState(() => !!sesion);
  const [d, setD] = useState<DatosOnboarding>(() => ({
    ...DATOS_INICIALES,
    correo: sesion?.user.email ?? '',
    nombre: (sesion?.user.user_metadata?.full_name as string | undefined) ?? '',
  }));
  const [paso, setPaso] = useState<Paso>('pais');
  const [intentados, setIntentados] = useState<Partial<Record<Paso, boolean>>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<{ mensaje: string; correoExiste?: boolean } | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    setEnOnboarding(true);
    return () => setEnOnboarding(false);
  }, [setEnOnboarding]);

  const camino = caminoDePasos(d.uso, d.objetivo);
  const indice = camino.indexOf(paso);
  const cambiar = (parcial: Partial<DatosOnboarding>) => setD((actual) => ({ ...actual, ...parcial }));

  function irA(nuevo: Paso) {
    setError(null);
    setPaso(nuevo);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  function atras() {
    if (indice === 0) {
      if (conSesion) cerrarSesion();
      else router.back();
      return;
    }
    irA(pasoAnterior(paso, d.uso, d.objetivo));
  }

  function puedeSeguir(): boolean {
    if (paso === 'datos') return Object.keys(erroresDatosPersonales(d, { pideContrasena: !conSesion })).length === 0;
    if (paso === 'plan') return planDelOnboarding(d).error === null;
    if (paso === 'privacidad') return !faltanObligatorias(d.consentimientos);
    return true;
  }

  async function continuar() {
    if (paso === 'listo') {
      marcarOnboardingListo();
      return;
    }
    if (!puedeSeguir()) {
      setIntentados((t) => ({ ...t, [paso]: true }));
      return;
    }
    if (paso === 'privacidad') return guardar();
    irA(pasoSiguiente(paso, d.uso, d.objetivo));
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    const datos = paraGuardar(d, VERSION_POLITICA, idiomaActual());

    if (!conSesion) {
      const correo = d.correo.trim().toLowerCase();
      const { data, error: errorRegistro } = await supabase.auth.signUp({
        email: correo,
        password: d.contrasena,
        options: { data: { full_name: d.nombre.trim() } },
      });
      if (errorRegistro) {
        setGuardando(false);
        const correoExiste = errorRegistro.code === 'user_already_exists' || errorRegistro.code === 'email_exists';
        return setError({ mensaje: t(`errores.${traducirErrorAuth(errorRegistro)}`, { min: LARGO_MINIMO_CONTRASENA }), correoExiste });
      }
      if (!data.session) {
        // El proyecto pide confirmar el correo: guardamos el onboarding y se completa al entrar.
        await guardarOnboardingPendiente(datos);
        setGuardando(false);
        setEnOnboarding(false);
        return router.replace({ pathname: '/confirmar-correo', params: { correo } });
      }
    }

    const { error: errorGuardar } = await supabase.rpc('completar_onboarding', { datos });
    setGuardando(false);
    if (errorGuardar) {
      return setError({ mensaje: t('errores.guardarDatos') });
    }
    irA('listo');
  }

  const intentado = !!intentados[paso];
  const props = { d, cambiar, intentado };
  const textoBoton =
    paso === 'listo'
      ? t('onboarding.botones.entrarApp')
      : paso === 'privacidad'
        ? conSesion
          ? t('onboarding.botones.guardar')
          : t('onboarding.botones.crearCuenta')
        : t('onboarding.botones.continuar');

  return (
    <Pantalla refScroll={scroll}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, minHeight: ALTO_TOCABLE }}>
        {paso !== 'listo' && (
          <Pressable
            accessibilityRole="button"
            onPress={atras}
            disabled={guardando}
            hitSlop={8}
            style={{ minHeight: ALTO_TOCABLE, justifyContent: 'center' }}>
            <Texto style={{ fontFamily: FUENTES.textoFuerte }}>
              {indice === 0 ? (conSesion ? t('comun.salir') : t('comun.volver')) : t('comun.atrasFlecha')}
            </Texto>
          </Pressable>
        )}
        <PuntosProgreso total={camino.length} actual={indice} />
      </View>

      {paso === 'pais' && <PasoPais {...props} />}
      {paso === 'datos' && <PasoDatos {...props} conSesion={conSesion} />}
      {paso === 'uso' && <PasoUso {...props} />}
      {paso === 'objetivo' && <PasoObjetivo {...props} />}
      {paso === 'plan' && <PasoPlan {...props} />}
      {paso === 'privacidad' && <PasoPrivacidad {...props} />}
      {paso === 'listo' && <PasoListo d={d} />}

      {error && (
        <View style={{ gap: ESPACIO.s }}>
          <Aviso mensaje={error.mensaje} />
          {error.correoExiste && (
            <Boton
              titulo={t('onboarding.botones.irAEntrar')}
              variante="secundario"
              onPress={() => {
                setEnOnboarding(false);
                router.replace('/entrar');
              }}
            />
          )}
        </View>
      )}

      <View style={{ flex: 1, justifyContent: 'flex-end', paddingTop: ESPACIO.m }}>
        <Boton titulo={textoBoton} onPress={continuar} cargando={guardando} />
      </View>
    </Pantalla>
  );
}
