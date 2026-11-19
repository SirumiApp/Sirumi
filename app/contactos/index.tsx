import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { clientesFrecuentes, estadisticasContacto } from '@/lib/contactos';
import { hoyEn } from '@/lib/fechas';
import { useNegocio } from '@/negocio/contexto';
import { usePlata } from '@/personal/ganchos';
import { ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

type Filtro = 'todos' | 'cliente' | 'proveedor';
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Clientes y proveedores del negocio (spec 03, §6; regla B11). */
export default function Contactos() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const ejemplo = useModoEjemplo();
  const { negocio, contactos, movimientos } = useNegocio();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const frecuentes = clientesFrecuentes(movimientos, hoyEn()).filter((f) => contactos.some((c) => c.id === f.id));
  const dormidos = frecuentes.filter((f) => f.dormido);
  const nombreDe = (id: string) => contactos.find((c) => c.id === id)?.nombre ?? '—';

  const texto = sinTildes(busqueda.trim());
  const lista = contactos.filter(
    (c) =>
      (filtro === 'todos' || c.tipo === filtro) &&
      (!texto || [c.nombre, c.celular, c.documento].some((v) => sinTildes(v).includes(texto))),
  );

  return (
    <PantallaAjuste titulo={t('contactos.titulo')} detalle={t('contactos.detalle')}>
      <View style={{ flexDirection: 'row', gap: ESPACIO.s }}>
        {(['todos', 'cliente', 'proveedor'] as const).map((f) => (
          <Chip key={f} texto={t(`contactos.filtros.${f}`)} elegido={filtro === f} onPress={() => setFiltro(f)} />
        ))}
      </View>
      {contactos.length > 5 && <CampoTexto etiqueta="" accessibilityLabel={t('contactos.buscar')} placeholder={t('contactos.buscar')} value={busqueda} onChangeText={setBusqueda} />}

      {contactos.length === 0 && (
        <View style={{ alignItems: 'center', gap: ESPACIO.s, paddingVertical: ESPACIO.l }}>
          <Emoji name="apreton-de-manos" size={64} />
          <Texto variante="suave" style={{ textAlign: 'center' }}>
            {t('contactos.vacio')}
          </Texto>
        </View>
      )}
      {contactos.length > 0 && lista.length === 0 && <Texto variante="suave">{t('contactos.sinResultados')}</Texto>}

      {/* B11b · Mejores clientes y los que hace rato no compran */}
      {filtro !== 'proveedor' && !busqueda.trim() && frecuentes.length > 0 && (
        <View style={[{ gap: ESPACIO.xs, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta }, sombraSuave(oscuro)]}>
          <Texto variante="subtitulo">{t('contactos.frecuentes.titulo')}</Texto>
          {frecuentes.slice(0, 5).map((f, i) => (
            <Pressable key={f.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/contactos/[id]', params: { id: f.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, minHeight: 44 }}>
              <Texto variante="fuerte" style={{ width: 22 }}>
                {i + 1}.
              </Texto>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Texto variante="fuerte" numberOfLines={1}>
                  {nombreDe(f.id)}
                </Texto>
                <Texto variante="pequeno">{t('contactos.frecuentes.compras', { count: f.compras, dias: f.diasSinComprar })}</Texto>
              </View>
              <Texto variante="fuerte">{plata(f.total)}</Texto>
            </Pressable>
          ))}
          {dormidos.length > 0 && (
            <>
              <Texto variante="subtitulo" style={{ marginTop: ESPACIO.s }}>
                {t('contactos.frecuentes.dormidos')}
              </Texto>
              <Texto variante="pequeno">{t('contactos.frecuentes.dormidosDetalle')}</Texto>
              {dormidos.slice(0, 5).map((f) => (
                <Pressable key={f.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/contactos/[id]', params: { id: f.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, minHeight: 44 }}>
                  <Texto variante="fuerte" numberOfLines={1} style={{ flex: 1 }}>
                    {nombreDe(f.id)}
                  </Texto>
                  <Texto variante="pequeno" color={colores.avisoTexto}>
                    {t('contactos.frecuentes.hace', { count: f.diasSinComprar })}
                  </Texto>
                </Pressable>
              ))}
            </>
          )}
        </View>
      )}

      {lista.map((c) => {
        const e = estadisticasContacto(c.id, movimientos);
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/contactos/[id]', params: { id: c.id } })}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 72, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.98 : 1 }] },
              sombraSuave(oscuro),
            ]}>
            <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.seleccionado }}>
              <Emoji name={c.tipo === 'cliente' ? 'tienda' : 'camion'} size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Texto variante="fuerte" numberOfLines={1}>
                {c.nombre}
              </Texto>
              <Texto variante="pequeno" numberOfLines={1}>
                {t(`contactos.${c.tipo}`)} · {t('contactos.movimientos', { count: e.movimientos })}
              </Texto>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }}>{plata(e.total)}</Texto>
              {e.pendiente > 0 && (
                <Texto variante="pequeno" color={colores.avisoTexto} style={{ fontFamily: FUENTES.textoFuerte }}>
                  {c.tipo === 'cliente' ? t('contactos.teDebe', { monto: plata(e.pendiente) }) : t('contactos.leDebes', { monto: plata(e.pendiente) })}
                </Texto>
              )}
            </View>
          </Pressable>
        );
      })}

      {negocio && <Boton titulo={t('contactos.agregar')} onPress={() => (ejemplo ? avisarEjemplo() : router.push({ pathname: '/contactos/[id]', params: { id: 'nuevo' } }))} />}
    </PantallaAjuste>
  );
}
