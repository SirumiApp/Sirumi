import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { valorInventario } from '@/lib/inventario';
import { useNegocio } from '@/negocio/contexto';
import { crearBodega, hacerPrincipal, leerErrorInventario, paraReglas, quitarBodega, renombrarBodega } from '@/negocio/inventarioDatos';
import { usePlata } from '@/personal/ganchos';
import { ESPACIO, FUENTES, useTema } from '@/theme';

/** Bodegas (spec 04, §1): unidades y valor a costo de cada una, una principal, quitar solo si está vacía. */
export default function Bodegas() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const { negocio, bodegas, productos, stock, actualizar } = useNegocio();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<string | null>(null);
  const reglas = paraReglas(productos);

  function mostrar(e: { message?: string; details?: string | null } | null) {
    const err = leerErrorInventario(e);
    if (!err) return false;
    const conocidos = ['bodegaConStock', 'bodegaPrincipal'];
    setError(conocidos.includes(err.codigo) ? t(`inventario.errores.${err.codigo}` as 'inventario.errores.general', err.detalle) : t('inventario.errores.general'));
    return true;
  }

  async function crear() {
    if (!negocio || !nueva.trim()) return;
    setError(null);
    const { error: e } = await crearBodega(negocio.id, nueva);
    if (!mostrar(e)) {
      setNueva('');
      actualizar();
    }
  }

  return (
    <PantallaAjuste titulo={t('inventario.bodegas')} detalle={t('inventario.bodegasPantalla.detalle')}>
      {bodegas.map((b) => {
        const v = valorInventario(reglas, stock, b.id);
        const abiertaEsta = abierta === b.id;
        return (
          <Tarjeta key={b.id} style={{ gap: ESPACIO.s, padding: ESPACIO.m }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: abiertaEsta }}
              onPress={() => {
                setError(null);
                setAbierta(abiertaEsta ? null : b.id);
                setNombre(b.nombre);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 48 }}>
              <Emoji name={b.principal ? 'casa' : 'tienda'} size={30} />
              <View style={{ flex: 1 }}>
                <Texto variante="fuerte">{b.nombre}</Texto>
                <Texto variante="pequeno">{t('inventario.bodegasPantalla.valor', { unidades: t('inventario.unidades', { count: v.unidades }), valor: plata(v.aCosto) })}</Texto>
              </View>
              {b.principal && (
                <View style={{ paddingHorizontal: ESPACIO.s + 4, paddingVertical: 4, borderRadius: 999, backgroundColor: colores.seleccionado }}>
                  <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 13, lineHeight: 17 }} color={colores.enlace}>
                    {t('inventario.bodegasPantalla.principal')}
                  </Texto>
                </View>
              )}
            </Pressable>
            {abiertaEsta && (
              <View style={{ gap: ESPACIO.s }}>
                <CampoTexto etiqueta={t('inventario.bodegasPantalla.renombrar')} value={nombre} onChangeText={setNombre} maxLength={40} />
                <Boton
                  titulo={t('inventario.bodegasPantalla.guardar')}
                  variante="secundario"
                  onPress={async () => {
                    if (!nombre.trim()) return;
                    const { error: e } = await renombrarBodega(b.id, nombre);
                    if (!mostrar(e)) {
                      setAbierta(null);
                      actualizar();
                    }
                  }}
                />
                {!b.principal && (
                  <Boton
                    titulo={t('inventario.bodegasPantalla.hacerPrincipal')}
                    variante="secundario"
                    onPress={async () => {
                      const { error: e } = await hacerPrincipal(b.id);
                      if (!mostrar(e)) actualizar();
                    }}
                  />
                )}
                {!b.principal && (
                  <Boton
                    titulo={t('inventario.bodegasPantalla.quitar')}
                    variante="texto"
                    onPress={() =>
                      Alert.alert(t('inventario.bodegasPantalla.quitar'), t('inventario.bodegasPantalla.confirmarQuitar'), [
                        { text: t('movimiento.cancelar'), style: 'cancel' },
                        {
                          text: t('inventario.bodegasPantalla.quitar'),
                          style: 'destructive',
                          onPress: async () => {
                            const { error: e } = await quitarBodega(b.id);
                            if (!mostrar(e)) {
                              setAbierta(null);
                              actualizar();
                            }
                          },
                        },
                      ])
                    }
                  />
                )}
              </View>
            )}
          </Tarjeta>
        );
      })}

      {error && <Aviso mensaje={error} />}

      <Texto variante="subtitulo">{t('inventario.bodegasPantalla.nueva')}</Texto>
      <CampoTexto etiqueta="" accessibilityLabel={t('inventario.bodegasPantalla.nueva')} placeholder={t('inventario.bodegasPantalla.ejemploNombre')} value={nueva} onChangeText={setNueva} maxLength={40} onSubmitEditing={crear} />
      <Boton titulo={t('inventario.bodegasPantalla.crear')} onPress={crear} />
    </PantallaAjuste>
  );
}
