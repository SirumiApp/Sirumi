import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { usoDeApp, veNegocio, vePersonal } from '@/auth/modo';
import { actualizarPerfil, actualizarPreferencias, usePerfil } from '@/auth/perfil';
import { useSesion } from '@/auth/sesion';
import { compartirArchivo, todosMisMovimientos } from '@/ajustes/archivos';
import { cambiarModoEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { TarjetaAvisos } from '@/notificaciones/TarjetaAvisos';
import { sonidoActivo } from '@/pos/aviso';
import { Aviso } from '@/components/Aviso';
import { BotonApariencia } from '@/components/BotonApariencia';
import { Chip } from '@/components/Chip';
import { FilaAjuste } from '@/components/FilaAjuste';
import { Interruptor } from '@/components/Interruptor';
import { GrupoAjustes, PantallaAjuste } from '@/components/PantallaAjuste';
import { SelectorIdioma } from '@/components/SelectorIdioma';
import { Texto } from '@/components/Texto';
import { movimientosACsv } from '@/lib/exportar';
import { hoyEn } from '@/lib/fechas';
import { paisPorCodigo } from '@/onboarding/paises';
import { usePersonal } from '@/personal/contexto';
import { useNombreCategoria } from '@/personal/ganchos';
import { ESPACIO, useTema } from '@/theme';

const CORREO_SOPORTE = 'sirumi.app@gmail.com';

/** Ajustes (docs/specs/02-personal.md, pantalla 6), organizados como en el prototipo. */
export default function Ajustes() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const { sesion } = useSesion();
  const perfil = usePerfil();
  const { categorias } = usePersonal();
  const nombreCategoria = useNombreCategoria();
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'info' | 'error' } | null>(null);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const pais = paisPorCodigo(perfil?.country ?? 'CO');
  const ejemplo = useModoEjemplo();
  const uso = usoDeApp(perfil?.usage);
  const avisos = ((perfil?.preferences as { notificaciones?: { ventas?: boolean; recordatorios?: boolean; impuestos?: boolean; extractos?: boolean } } | null)?.notificaciones ?? {});
  const mostrarIngresos = (perfil?.preferences as { mostrarIngresos?: boolean } | null)?.mostrarIngresos !== false;

  async function exportarCsv() {
    setAviso({ texto: t('ajustes.exportando'), tipo: 'info' });
    try {
      const filas = await todosMisMovimientos();
      if (filas.length === 0) return setAviso({ texto: t('ajustes.sinMovimientos'), tipo: 'info' });
      const porId = new Map(categorias.map((c) => [c.id, c]));
      const csv = movimientosACsv(
        filas.map((m) => ({
          fecha: m.date,
          tipo: m.kind === 'ingreso' ? t('movimiento.ingreso') : t('movimiento.gasto'),
          categoria: nombreCategoria(m.category_id ? porId.get(m.category_id) : undefined),
          descripcion: m.description ?? '',
          monto: m.amount,
        })),
        {
          fecha: t('ajustes.columnas.fecha'),
          tipo: t('ajustes.columnas.tipo'),
          categoria: t('ajustes.columnas.categoria'),
          descripcion: t('ajustes.columnas.descripcion'),
          monto: t('ajustes.columnas.monto'),
        },
      );
      await compartirArchivo(`sirumi-movimientos-${hoyEn()}.csv`, csv, 'text/csv');
      setAviso({ texto: t('ajustes.exportado'), tipo: 'info' });
    } catch {
      setAviso({ texto: t('ajustes.errorExportar'), tipo: 'error' });
    }
  }

  return (
    <PantallaAjuste titulo={t('ajustes.titulo')}>
      {aviso && <Aviso mensaje={aviso.texto} tipo={aviso.tipo} />}

      {/* Para qué usa Sirumi (lo que eligió en el onboarding): decide si ve Personal, Negocio o las dos */}
      <GrupoAjustes titulo={t('ajustes.uso.titulo')}>
        <View style={{ gap: ESPACIO.s, paddingVertical: ESPACIO.s + 4 }}>
          <Texto variante="pequeno">{t('ajustes.uso.detalle')}</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
            {(['personal', 'negocio', 'ambos'] as const).map((u) => (
              <Chip key={u} texto={t(`ajustes.uso.${u}`)} elegido={uso === u} onPress={() => sesion && uso !== u && actualizarPerfil(sesion.user.id, { usage: u })} />
            ))}
          </View>
        </View>
      </GrupoAjustes>

      {/* Notificaciones del celular */}
      <GrupoAjustes titulo={t('notificaciones.titulo')}>
        <View style={{ paddingVertical: ESPACIO.s }}>
          <TarjetaAvisos siempre />
        </View>
        {veNegocio(uso) && (
          <FilaAjuste
            emoji="bolsa-de-dinero"
            titulo={t('notificaciones.ventas')}
            detalle={t('notificaciones.ventasDetalle')}
            derecha={
              <Interruptor
                etiqueta={t('notificaciones.ventas')}
                encendido={avisos.ventas !== false}
                onCambio={(valor) => sesion && actualizarPreferencias(sesion.user.id, perfil?.preferences, { notificaciones: { ...avisos, ventas: valor } })}
              />
            }
          />
        )}
        <FilaAjuste
          emoji="calendario"
          titulo={t('notificaciones.recordatorios')}
          detalle={t('notificaciones.recordatoriosDetalle')}
          derecha={
            <Interruptor
              etiqueta={t('notificaciones.recordatorios')}
              encendido={avisos.recordatorios !== false}
              onCambio={(valor) => sesion && actualizarPreferencias(sesion.user.id, perfil?.preferences, { notificaciones: { ...avisos, recordatorios: valor } })}
            />
          }
        />
        {veNegocio(uso) && (
          <FilaAjuste
            emoji="balanza"
            titulo={t('notificaciones.impuestos')}
            detalle={t('notificaciones.impuestosDetalle')}
            derecha={
              <Interruptor
                etiqueta={t('notificaciones.impuestos')}
                encendido={avisos.impuestos !== false}
                onCambio={(valor) => sesion && actualizarPreferencias(sesion.user.id, perfil?.preferences, { notificaciones: { ...avisos, impuestos: valor } })}
              />
            }
          />
        )}
        <FilaAjuste
          emoji="banco"
          titulo={t('notificaciones.extractos')}
          detalle={t('notificaciones.extractosDetalle')}
          derecha={
            <Interruptor
              etiqueta={t('notificaciones.extractos')}
              encendido={avisos.extractos !== false}
              onCambio={(valor) => sesion && actualizarPreferencias(sesion.user.id, perfil?.preferences, { notificaciones: { ...avisos, extractos: valor } })}
            />
          }
        />
      </GrupoAjustes>

      <GrupoAjustes titulo={t('ajustes.secciones.contenido')}>
        <FilaAjuste
          emoji="ojos"
          titulo={t('ejemplo.ver')}
          detalle={t('ejemplo.verDetalle')}
          onPress={() => cambiarModoEjemplo(!ejemplo)}
          derecha={<Interruptor etiqueta={t('ejemplo.ver')} encendido={ejemplo} onCambio={cambiarModoEjemplo} />}
        />
        {vePersonal(uso) && (
          <>
            <FilaAjuste emoji="aguacate" titulo={t('ajustes.categorias.titulo')} detalle={t('ajustes.categorias.detalle')} onPress={() => router.push('/ajustes/categorias')} />
            <FilaAjuste emoji="bolsa-de-dinero" titulo={t('ajustes.topes.titulo')} detalle={t('ajustes.topes.detalle')} onPress={() => router.navigate('/topes')} />
            <FilaAjuste emoji="repetir" titulo={t('recurrentes.personal.titulo')} detalle={t('recurrentes.personal.entradaDetalle')} onPress={() => router.push('/recurrentes?ambito=personal')} />
            <FilaAjuste emoji="banco" titulo={t('extractos.entrada')} detalle={t('extractos.entradaDetalle')} onPress={() => router.push('/extractos?ambito=personal')} />
          </>
        )}
        {veNegocio(uso) && (
        <FilaAjuste
          emoji="campana"
          titulo={t('pos.ajustes.sonido')}
          detalle={t('pos.ajustes.sonidoDetalle')}
          derecha={
            <Interruptor
              etiqueta={t('pos.ajustes.sonido')}
              encendido={sonidoActivo(perfil?.preferences)}
              onCambio={(valor) => sesion && actualizarPreferencias(sesion.user.id, perfil?.preferences, { pos: { sonido: valor } })}
            />
          }
        />
        )}
        {vePersonal(uso) && (
        <FilaAjuste
          emoji="mas"
          titulo={t('ajustes.mostrarIngresos.titulo')}
          detalle={t('ajustes.mostrarIngresos.detalle')}
          derecha={
            <Interruptor
              etiqueta={t('ajustes.mostrarIngresos.titulo')}
              encendido={mostrarIngresos}
              onCambio={(valor) => sesion && actualizarPreferencias(sesion.user.id, perfil?.preferences, { mostrarIngresos: valor })}
            />
          }
        />
        )}
        <FilaAjuste emoji="apreton-de-manos" titulo={t('vendedores.unirme')} detalle={t('vendedores.unirmeDetalle')} onPress={() => router.push('/ajustes/unirme')} />
        <FilaAjuste emoji="grafico-de-barras" titulo={t('ajustes.exportar.titulo')} detalle={t('ajustes.exportar.detalle')} onPress={exportarCsv} />
      </GrupoAjustes>

      <GrupoAjustes titulo={t('ajustes.secciones.region')}>
        <View style={{ gap: ESPACIO.s, paddingVertical: ESPACIO.s + 4 }}>
          <Texto variante="fuerte">{t('ajustes.idioma.titulo')}</Texto>
          <SelectorIdioma />
        </View>
        <FilaAjuste
          izquierda={<Texto style={{ fontSize: 24, lineHeight: 30 }}>{pais.bandera}</Texto>}
          titulo={t('ajustes.pais.titulo')}
          detalle={t('ajustes.pais.detalle', { pais: t(`paises.${pais.codigo}`), moneda: pais.moneda })}
          onPress={() => router.push('/ajustes/pais')}
        />
        <FilaAjuste emoji="media-luna" titulo={t('ajustes.apariencia.titulo')} detalle={t('ajustes.apariencia.detalle')} derecha={<BotonApariencia />} />
      </GrupoAjustes>

      <GrupoAjustes titulo={t('ajustes.secciones.cuenta')}>
        <FilaAjuste emoji="nube" titulo={t('ajustes.cuenta.titulo')} detalle={t('ajustes.cuenta.detalle')} onPress={() => router.push('/ajustes/cuenta')} />
      </GrupoAjustes>

      <GrupoAjustes titulo={t('ajustes.secciones.mas')}>
        <FilaAjuste emoji="libro-rojo" titulo={t('ajustes.legal.titulo')} detalle={t('ajustes.legal.detalle')} onPress={() => router.push('/ajustes/legal')} />
        <FilaAjuste
          emoji="sobre"
          titulo={t('ajustes.problema.titulo')}
          detalle={t('ajustes.problema.detalle')}
          onPress={() => Linking.openURL(`mailto:${CORREO_SOPORTE}?subject=${encodeURIComponent(t('ajustes.correoAsunto'))}`)}
        />
        <FilaAjuste emoji="destellos" titulo={t('ajustes.novedades.titulo')} detalle={t('ajustes.novedades.detalle', { version })} />
      </GrupoAjustes>

      <Texto variante="pequeno" style={{ textAlign: 'center' }} color={colores.textoSuave}>
        sirumi · {t('ajustes.version', { version })}
      </Texto>
    </PantallaAjuste>
  );
}
