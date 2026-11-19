import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Chip } from '@/components/Chip';
import { Icono } from '@/components/Icono';
import { Texto } from '@/components/Texto';
import { stockDeVariante, validarSalida, type FilaStock } from '@/lib/inventario';
import { leerErrorInventario, trasladarInventario, type Bodega, type Producto } from '@/negocio/inventarioDatos';
import { ALTO_TOCABLE, ESPACIO, useTema } from '@/theme';

import { CampoCantidad } from './Piezas';

type Props = { abierta: boolean; producto: Producto; bodegas: Bodega[]; stock: FilaStock[]; onCerrar: () => void; onListo: () => void };

/** Mover unidades de una variante entre bodegas (spec 04, §4; regla C4). No deja mover más de lo que hay. */
export function HojaTrasladoInventario(props: Props) {
  const { colores } = useTema();
  return (
    <Modal visible={props.abierta} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        {props.abierta && <Formulario {...props} />}
      </SafeAreaView>
    </Modal>
  );
}

function Formulario({ producto, bodegas, stock, onCerrar, onListo }: Props) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const [variante, setVariante] = useState(producto.variantes.find((v) => stockDeVariante(v.id, stock) > 0)?.id ?? producto.variantes[0]?.id ?? null);
  const conUnidades = (vId: string | null) => bodegas.find((b) => vId && stockDeVariante(vId, stock, b.id) > 0)?.id ?? bodegas[0]?.id ?? null;
  const [desde, setDesde] = useState<string | null>(conUnidades(variante));
  const [hacia, setHacia] = useState<string | null>(bodegas.find((b) => b.id !== desde)?.id ?? null);
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const disponibles = variante && desde ? stockDeVariante(variante, stock, desde) : 0;
  const nombre = new Map(bodegas.map((b) => [b.id, b.nombre]));

  async function mover() {
    if (!variante || !desde || !hacia) return;
    const v = validarSalida(cantidad, disponibles);
    if (v?.codigo === 'stockInsuficiente') return setError(t('inventario.errores.stockInsuficiente', { disponible: disponibles, bodega: nombre.get(desde) }));
    if (v) return setError(t('inventario.errores.cantidadInvalida'));
    setGuardando(true);
    const { error: e } = await trasladarInventario(variante, desde, hacia, cantidad);
    setGuardando(false);
    const err = leerErrorInventario(e);
    if (err) return setError(err.codigo === 'stockInsuficiente' ? t('inventario.errores.stockInsuficiente', err.detalle) : t('inventario.errores.general'));
    onListo();
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comun.cerrar')}
          onPress={onCerrar}
          style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.relleno }}>
          <Icono nombre="cerrar" tamano={18} />
        </Pressable>
        <Texto variante="subtitulo" style={{ flex: 1 }}>
          {t('inventario.traslado.titulo')}
        </Texto>
      </View>
      <Texto variante="fuerte">{producto.nombre}</Texto>

      {producto.variantes.length > 1 && (
        <>
          <Texto variante="fuerte">{t('inventario.traslado.variante')}</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
            {producto.variantes.map((v) => (
              <Chip
                key={v.id}
                texto={`${v.nombre} · ${stockDeVariante(v.id, stock)}`}
                elegido={variante === v.id}
                onPress={() => {
                  setVariante(v.id);
                  const d = conUnidades(v.id);
                  setDesde(d);
                  if (hacia === d) setHacia(bodegas.find((b) => b.id !== d)?.id ?? null);
                }}
              />
            ))}
          </View>
        </>
      )}

      <Texto variante="fuerte">{t('inventario.traslado.desde')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {bodegas.map((b) => (
          <Chip
            key={b.id}
            texto={`${b.nombre} · ${variante ? stockDeVariante(variante, stock, b.id) : 0}`}
            elegido={desde === b.id}
            onPress={() => {
              setDesde(b.id);
              if (hacia === b.id) setHacia(bodegas.find((x) => x.id !== b.id)?.id ?? null);
            }}
          />
        ))}
      </View>
      <Texto variante="fuerte">{t('inventario.traslado.hacia')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {bodegas
          .filter((b) => b.id !== desde)
          .map((b) => (
            <Chip key={b.id} texto={b.nombre} elegido={hacia === b.id} onPress={() => setHacia(b.id)} />
          ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m }}>
        <View style={{ flex: 1 }}>
          <Texto variante="fuerte">{t('inventario.traslado.cantidad')}</Texto>
          <Texto variante="pequeno">{t('inventario.traslado.disponibles', { n: disponibles })}</Texto>
        </View>
        <CampoCantidad etiqueta={t('inventario.traslado.cantidad')} valor={cantidad} onCambio={(v) => setCantidad(Math.min(v, Math.max(disponibles, 1)))} />
      </View>

      {error && <Aviso mensaje={error} />}
      <Boton titulo={t('inventario.traslado.mover')} onPress={mover} cargando={guardando} disabled={!hacia || disponibles === 0} />
    </ScrollView>
  );
}
