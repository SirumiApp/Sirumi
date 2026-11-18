import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { primerNombre, usePerfil } from '@/auth/perfil';
import { cerrarSesion, useSesion } from '@/auth/sesion';
import { Boton } from '@/components/Boton';
import { Logo } from '@/components/Logo';
import { Pantalla } from '@/components/Pantalla';
import { Preferencias } from '@/components/Preferencias';
import { Texto } from '@/components/Texto';
import { hoyEn } from '@/lib/fechas';
import type { Movimiento } from '@/lib/personal';
import { guardarAlerta, leerAlerta, useCategorias, useTopes, type AlertaTopes } from '@/personal/datos';
import { HojaMovimiento } from '@/personal/HojaMovimiento';
import { VistaAnalisis } from '@/personal/VistaAnalisis';
import { VistaInicio } from '@/personal/VistaInicio';
import { VistaTopes } from '@/personal/VistaTopes';
import { ALTO_TOCABLE, ESPACIO, FUENTES, RADIO, useTema } from '@/theme';

type Vista = 'inicio' | 'analisis' | 'topes';
const VISTAS: Vista[] = ['inicio', 'analisis', 'topes'];

/** Finanzas personales: Inicio, Análisis y Topes (como en el prototipo). */
export default function Personal() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const { sesion } = useSesion();
  const perfil = usePerfil();

  const [vista, setVista] = useState<Vista>('inicio');
  const [version, setVersion] = useState(0);
  const [hoja, setHoja] = useState<{ abierta: boolean; movimiento: Movimiento | null }>({ abierta: false, movimiento: null });
  // La alerta se guarda en el perfil; aquí se muestra al instante mientras se guarda.
  const [alertaLocal, setAlertaLocal] = useState<AlertaTopes | null>(null);
  const alerta = alertaLocal ?? leerAlerta(perfil?.preferences);

  const { categorias } = useCategorias();
  const { topes } = useTopes(version);
  const nombre = primerNombre(perfil?.full_name);
  const actualizar = () => setVersion((v) => v + 1);

  function cambiarAlerta(nueva: AlertaTopes) {
    setAlertaLocal(nueva);
    if (sesion) guardarAlerta(sesion.user.id, perfil?.preferences, nueva);
  }

  return (
    <View style={{ flex: 1 }}>
      <Pantalla>
        <Logo />
        <Preferencias />
        <Texto variante="suave">{nombre ? t('personal.saludoNombre', { nombre }) : t('personal.saludo')}</Texto>

        {/* Pestañas de la sección personal */}
        <View
          accessibilityRole="tablist"
          style={{ flexDirection: 'row', padding: 4, borderRadius: RADIO.m, backgroundColor: colores.seleccionado }}>
          {VISTAS.map((v) => {
            const activa = vista === v;
            return (
              <Pressable
                key={v}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                onPress={() => setVista(v)}
                style={{
                  flex: 1,
                  minHeight: ALTO_TOCABLE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: RADIO.s,
                  backgroundColor: activa ? colores.tarjeta : 'transparent',
                }}>
                <Texto style={{ fontFamily: FUENTES.textoFuerte }} color={activa ? colores.texto : colores.textoSuave}>
                  {t(`vistas.${v}`)}
                </Texto>
              </Pressable>
            );
          })}
        </View>

        {vista === 'inicio' && (
          <VistaInicio categorias={categorias} topes={topes} version={version} onEditar={(m) => setHoja({ abierta: true, movimiento: m })} />
        )}
        {vista === 'analisis' && <VistaAnalisis categorias={categorias} topes={topes} alerta={alerta} version={version} />}
        {vista === 'topes' && (
          <VistaTopes
            categorias={categorias}
            topes={topes}
            alerta={alerta}
            version={version}
            onCambiarAlerta={cambiarAlerta}
            onTopeGuardado={actualizar}
          />
        )}

        {/* Mientras no exista Ajustes, cerrar sesión vive aquí. Deja espacio para el botón +. */}
        <View style={{ alignItems: 'center', paddingBottom: 72 }}>
          <Boton titulo={t('comun.cerrarSesion')} variante="texto" onPress={cerrarSesion} />
        </View>
      </Pantalla>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('inicio.agregar')}
        onPress={() => setHoja({ abierta: true, movimiento: null })}
        style={({ pressed }) => ({
          position: 'absolute',
          right: ESPACIO.m,
          bottom: ESPACIO.m,
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colores.accion,
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        })}>
        <Texto style={{ color: colores.textoSobreAccion, fontFamily: FUENTES.titulo, fontSize: 32, lineHeight: 36 }}>+</Texto>
      </Pressable>

      <HojaMovimiento
        abierta={hoja.abierta}
        movimiento={hoja.movimiento}
        categorias={categorias}
        hoy={hoyEn()}
        onCerrar={() => setHoja({ abierta: false, movimiento: null })}
        onGuardado={() => {
          setHoja({ abierta: false, movimiento: null });
          actualizar();
        }}
      />
    </View>
  );
}
