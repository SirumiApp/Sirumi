import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Share, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { useModoEjemplo } from '@/ejemplo/modo';
import { hoyEn } from '@/lib/fechas';
import { useNegocio } from '@/negocio/contexto';
import { borrarInvitacion, cargarVendedores, crearInvitacion, quitarVendedor, type Invitacion, type Vendedor } from '@/negocio/vendedoresDatos';
import { fechaCorta } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { ESPACIO, FUENTES, useTema } from '@/theme';

/** Vendedores (referencia: el staff de Shopify POS): un código por persona para que solo entre al POS de tu negocio. */
export default function Vendedores() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const ejemplo = useModoEjemplo();
  const { negocio, bodegas, ventas, version } = useNegocio();
  const [datos, setDatos] = useState<{ vendedores: Vendedor[]; invitaciones: Invitacion[] }>({ vendedores: [], invitaciones: [] });
  const [nombre, setNombre] = useState('');
  const [bodega, setBodega] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<{ codigo: string; nombre: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const hoy = hoyEn();
  const nombreBodega = new Map(bodegas.map((b) => [b.id, b.nombre]));

  const cargar = useCallback(async () => {
    if (!negocio || ejemplo) return;
    setDatos(await cargarVendedores(negocio.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` solo sirve para volver a leer
  }, [negocio, ejemplo, version]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor
    cargar();
  }, [cargar]);

  const mensaje = (codigo: string, quien: string) => t('vendedores.mensaje', { nombre: quien, negocio: negocio?.nombre ?? '', codigo });

  async function crear() {
    if (!negocio) return;
    if (!nombre.trim()) return setError(t('errores.vendedorSinNombre'));
    setError(null);
    setCreando(true);
    const { data, error: e } = await crearInvitacion(negocio.id, nombre, bodega);
    setCreando(false);
    if (e || typeof data !== 'string') return setError(t('vendedores.error'));
    setNuevo({ codigo: data, nombre: nombre.trim() });
    setNombre('');
    cargar();
  }

  function preguntarQuitar(v: Vendedor) {
    Alert.alert(t('vendedores.quitar'), t('vendedores.confirmarQuitar', { nombre: v.nombre }), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      {
        text: t('vendedores.quitar'),
        style: 'destructive',
        onPress: async () => {
          if (!negocio) return;
          const { error: e } = await quitarVendedor(negocio.id, v.usuario);
          if (e) return setError(t('vendedores.error'));
          cargar();
        },
      },
    ]);
  }

  return (
    <PantallaAjuste titulo={t('vendedores.titulo')} detalle={t('vendedores.detalle')}>
      {nuevo && (
        <Tarjeta style={{ alignItems: 'center', gap: ESPACIO.s }}>
          <Texto variante="etiqueta">{t('vendedores.codigoPara', { nombre: nuevo.nombre })}</Texto>
          <Texto selectable style={{ fontFamily: FUENTES.titulo, fontSize: 40, lineHeight: 48, letterSpacing: 6 }} accessibilityLabel={nuevo.codigo.split('').join(' ')}>
            {nuevo.codigo}
          </Texto>
          <Texto variante="pequeno" style={{ textAlign: 'center' }}>
            {t('vendedores.comoUsar')}
          </Texto>
          <Boton titulo={t('vendedores.compartir')} onPress={() => Share.share({ message: mensaje(nuevo.codigo, nuevo.nombre) })} />
        </Tarjeta>
      )}

      {/* Quiénes venden */}
      {datos.vendedores.length > 0 && <Texto variante="subtitulo">{t('vendedores.quienes')}</Texto>}
      {datos.vendedores.map((v) => {
        const suyas = ventas.filter((x) => x.vendedor === v.usuario && x.fecha === hoy && x.estado !== 'devuelta');
        return (
          <Tarjeta key={v.usuario} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, padding: ESPACIO.m }}>
            <Emoji name="persona" size={32} />
            <View style={{ flex: 1 }}>
              <Texto variante="fuerte">{v.nombre}</Texto>
              <Texto variante="pequeno">
                {[v.bodega ? nombreBodega.get(v.bodega) : t('vendedores.cualquierBodega'), t('vendedores.hoyVendio', { monto: plata(suyas.reduce((s, x) => s + x.total, 0)) })].join(' · ')}
              </Texto>
            </View>
            <Pressable accessibilityRole="button" onPress={() => preguntarQuitar(v)} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Texto variante="pequeno" color={colores.errorTexto} style={{ fontFamily: FUENTES.textoFuerte }}>
                {t('vendedores.quitar')}
              </Texto>
            </Pressable>
          </Tarjeta>
        );
      })}

      {/* Códigos sin usar */}
      {datos.invitaciones.length > 0 && <Texto variante="subtitulo">{t('vendedores.pendientes')}</Texto>}
      {datos.invitaciones.map((i) => (
        <Tarjeta key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, padding: ESPACIO.m }}>
          <View style={{ flex: 1 }}>
            <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 18, lineHeight: 24, letterSpacing: 3 }}>{i.codigo}</Texto>
            <Texto variante="pequeno">{t('vendedores.paraVence', { nombre: i.nombre, fecha: fechaCorta(i.vence.slice(0, 10), textosFecha) })}</Texto>
          </View>
          <Boton titulo={t('vendedores.compartirCorto')} variante="texto" onPress={() => Share.share({ message: mensaje(i.codigo, i.nombre) })} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('vendedores.borrarCodigo')}
            onPress={async () => {
              await borrarInvitacion(i.id);
              cargar();
            }}
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: 'center' }}>
            <Texto variante="pequeno" color={colores.errorTexto}>
              ✕
            </Texto>
          </Pressable>
        </Tarjeta>
      ))}

      {/* Nuevo código */}
      <Texto variante="subtitulo">{t('vendedores.invitar')}</Texto>
      <CampoTexto etiqueta={t('vendedores.nombre')} placeholder={t('vendedores.ejemploNombre')} value={nombre} onChangeText={setNombre} maxLength={40} />
      {bodegas.length > 1 && (
        <>
          <Texto variante="fuerte">{t('vendedores.bodega')}</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
            <Chip texto={t('vendedores.cualquierBodega')} elegido={bodega === null} onPress={() => setBodega(null)} />
            {bodegas.map((b) => (
              <Chip key={b.id} texto={b.nombre} elegido={bodega === b.id} onPress={() => setBodega(b.id)} />
            ))}
          </View>
        </>
      )}
      {error && <Aviso mensaje={error} />}
      <Boton titulo={t('vendedores.crearCodigo')} onPress={crear} cargando={creando} />
      <Texto variante="pequeno">{t('vendedores.queVe')}</Texto>
    </PantallaAjuste>
  );
}
