import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { actualizarPreferencias, usePerfil } from '@/auth/perfil';
import { useSesion } from '@/auth/sesion';
import { compartirArchivo, todosMisMovimientos } from '@/ajustes/archivos';
import { cambiarModoEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { sonidoActivo } from '@/pos/aviso';
import { Aviso } from '@/components/Aviso';
import { BotonApariencia } from '@/components/BotonApariencia';
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

      <GrupoAjustes titulo={t('ajustes.secciones.contenido')}>
        <FilaAjuste
          emoji="ojos"
          titulo={t('ejemplo.ver')}
          detalle={t('ejemplo.verDetalle')}
          onPress={() => cambiarModoEjemplo(!ejemplo)}
          derecha={<Interruptor etiqueta={t('ejemplo.ver')} encendido={ejemplo} onCambio={cambiarModoEjemplo} />}
        />
        <FilaAjuste emoji="aguacate" titulo={t('ajustes.categorias.titulo')} detalle={t('ajustes.categorias.detalle')} onPress={() => router.push('/ajustes/categorias')} />
        <FilaAjuste emoji="bolsa-de-dinero" titulo={t('ajustes.topes.titulo')} detalle={t('ajustes.topes.detalle')} onPress={() => router.navigate('/topes')} />
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
