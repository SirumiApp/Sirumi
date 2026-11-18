import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { Barra } from '@/components/Barra';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { Casilla } from '@/components/Casilla';
import { Chip } from '@/components/Chip';
import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { estadosDeTopes } from '@/lib/analisis';
import { hoyEn, periodoPredefinido } from '@/lib/fechas';
import { totalesDelPeriodo } from '@/lib/personal';
import { paisPorCodigo } from '@/onboarding/paises';
import { usePerfil } from '@/auth/perfil';
import { ALTO_TOCABLE, ESPACIO, FUENTES, useTema } from '@/theme';

import { guardarTope, useMovimientos, type AlertaTopes, type Categoria } from './datos';
import { useNombreCategoria, usePlata } from './ganchos';

const UMBRALES = [70, 80, 90];

type Props = {
  categorias: Categoria[];
  topes: Record<string, number>;
  alerta: AlertaTopes;
  version: number;
  onCambiarAlerta: (alerta: AlertaTopes) => void;
  onTopeGuardado: () => void;
};

/** Topes del mes por categoría (docs/specs/02-personal.md, pantalla 3; regla A3). */
export function VistaTopes({ categorias, topes, alerta, version, onCambiarAlerta, onTopeGuardado }: Props) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const nombreCategoria = useNombreCategoria();
  const [editando, setEditando] = useState<Categoria | null>(null);

  const hoy = hoyEn();
  const mes = periodoPredefinido('mes', hoy);
  const { movimientos } = useMovimientos(mes.desde, mes.hasta, version);
  const gastos = totalesDelPeriodo(movimientos, mes).gastoPorCategoria;
  const estados = estadosDeTopes(gastos, topes, mes, hoy, alerta);
  const deGasto = categorias.filter((c) => c.kind === 'gasto' && !c.hidden);

  return (
    <>
      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="subtitulo">{t('topes.titulo')}</Texto>
        <Texto variante="suave">{t('topes.detalle')}</Texto>
      </View>

      <Casilla
        titulo={t('topes.alerta', { umbral: alerta.umbral })}
        detalle={t('topes.alertaDetalle')}
        marcada={alerta.alertaActiva}
        onPress={() => onCambiarAlerta({ ...alerta, alertaActiva: !alerta.alertaActiva })}
      />
      {alerta.alertaActiva && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, flexWrap: 'wrap' }}>
          <Texto variante="fuerte">{t('topes.umbral')}</Texto>
          {UMBRALES.map((u) => (
            <Chip key={u} texto={`${u}%`} elegido={alerta.umbral === u} onPress={() => onCambiarAlerta({ ...alerta, umbral: u })} />
          ))}
        </View>
      )}

      {deGasto.map((c) => {
        const e = estados[c.id] ?? { gastado: 0, tope: 0, estado: 'sinTope' as const, porcentaje: 0 };
        const color = e.estado === 'superado' ? colores.error : e.estado === 'cuidado' ? colores.aviso : colores.accion;
        return (
          <Tarjeta key={c.id} style={{ gap: ESPACIO.s }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
              <Emoji name={c.emoji as NombreEmoji} size={28} />
              <View style={{ flex: 1 }}>
                <Texto variante="fuerte">{nombreCategoria(c)}</Texto>
                <Texto variante="pequeno">
                  {e.tope > 0
                    ? t('topes.gastoDeTope', { gastado: plata(e.gastado), tope: plata(e.tope) })
                    : t('topes.gastoSinTope', { gastado: plata(e.gastado) })}
                </Texto>
              </View>
              <View style={{ paddingHorizontal: ESPACIO.s, paddingVertical: 2, borderRadius: 999, backgroundColor: colores.seleccionado }}>
                <Texto
                  variante="pequeno"
                  style={{ fontFamily: FUENTES.textoFuerte }}
                  color={e.estado === 'superado' || e.estado === 'cuidado' ? color : colores.texto}>
                  {t(`topes.estado.${e.estado}`, { porcentaje: e.porcentaje })}
                </Texto>
              </View>
            </View>
            {e.tope > 0 && <Barra valor={e.gastado / e.tope} color={color} />}
            <Pressable
              accessibilityRole="button"
              onPress={() => setEditando(c)}
              style={{ minHeight: ALTO_TOCABLE, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Texto style={{ fontFamily: FUENTES.textoFuerte }} color={colores.enlace}>
                {e.tope > 0 ? t('topes.cambiarTope') : t('topes.ponerTope')}
              </Texto>
            </Pressable>
          </Tarjeta>
        );
      })}

      <EditarTope
        categoria={editando}
        topeActual={editando ? (topes[editando.id] ?? 0) : 0}
        onCerrar={() => setEditando(null)}
        onGuardado={() => {
          setEditando(null);
          onTopeGuardado();
        }}
      />
    </>
  );
}

function EditarTope({
  categoria,
  topeActual,
  onCerrar,
  onGuardado,
}: {
  categoria: Categoria | null;
  topeActual: number;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { colores } = useTema();
  return (
    <Modal visible={!!categoria} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        {categoria && <FormularioTope key={categoria.id} categoria={categoria} topeActual={topeActual} onCerrar={onCerrar} onGuardado={onGuardado} />}
      </SafeAreaView>
    </Modal>
  );
}

function FormularioTope({
  categoria,
  topeActual,
  onCerrar,
  onGuardado,
}: {
  categoria: Categoria;
  topeActual: number;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { t } = useTranslation();
  const nombreCategoria = useNombreCategoria();
  const perfil = usePerfil();
  const separador = paisPorCodigo(perfil?.country ?? 'CO').separador;
  const [monto, setMonto] = useState(topeActual);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);

  async function guardar(valor: number) {
    setGuardando(true);
    const { error: e } = await guardarTope(categoria.id, valor);
    setGuardando(false);
    if (e) return setError(true);
    onGuardado();
  }

  return (
    <View style={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, flex: 1 }}>
          <Emoji name={categoria.emoji as NombreEmoji} size={32} />
          <Texto variante="subtitulo" style={{ flex: 1 }}>
            {t('topes.editarTitulo', { categoria: nombreCategoria(categoria) })}
          </Texto>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comun.cerrar')}
          onPress={onCerrar}
          style={{ minWidth: ALTO_TOCABLE, minHeight: ALTO_TOCABLE, alignItems: 'center', justifyContent: 'center' }}>
          <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 20 }}>✕</Texto>
        </Pressable>
      </View>
      <Texto variante="suave">{t('topes.editarAyuda')}</Texto>
      <CampoDinero etiqueta={t('topes.campo')} valor={monto} onCambio={setMonto} separador={separador} autoFocus />
      {error && <Aviso mensaje={t('topes.error')} />}
      <Boton titulo={t('topes.guardar')} onPress={() => guardar(monto)} cargando={guardando} />
      {topeActual > 0 && <Boton titulo={t('topes.quitar')} variante="texto" onPress={() => guardar(0)} />}
    </View>
  );
}
