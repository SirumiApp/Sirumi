import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { usePerfil } from '@/auth/perfil';
import { Barra } from '@/components/Barra';
import { Boton } from '@/components/Boton';
import { Chip } from '@/components/Chip';
import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { hoyEn } from '@/lib/fechas';
import { formatearCorto } from '@/lib/formato';
import { patrimonioActual, resumenDeudas, resumenMeta, serieDePatrimonio } from '@/lib/metas';
import { paisPorCodigo } from '@/onboarding/paises';
import { COLORES_GRAFICA, ESPACIO, FUENTES, sombraSuave, useTema } from '@/theme';

import { useTextosFecha, usePlata } from '../ganchos';
import { abonarDeuda, abonarMeta, borrarDelPlan, guardarActivo, guardarDeuda, guardarMeta, type Activo, type Deuda, type Foto, type Meta } from '../planDatos';
import { HojaAbono, HojaItem } from './Formularios';

const EMOJIS_METAS: NombreEmoji[] = ['salvavidas', 'isla', 'avion', 'portatil', 'casa', 'carro', 'moto', 'birrete', 'regalo', 'diamante', 'celular', 'alcancia', 'diana'];
const EMOJIS_DEUDAS: NombreEmoji[] = ['tarjeta', 'banco', 'apreton-de-manos', 'casa', 'carro', 'moto', 'birrete', 'bolsa-de-dinero', 'celular'];
const EMOJIS_ACTIVOS: NombreEmoji[] = ['cajero', 'grafica-que-sube', 'banco', 'moto', 'carro', 'casa', 'bolsa-de-dinero', 'diamante', 'portatil'];

type Comun = { alCambiar: (mensaje?: string) => void };

/** Botones de abono rápido (como el prototipo) y "Otro monto". */
function BotonesAbono({ montos, onAbonar, onOtro, etiqueta }: { montos: number[]; onAbonar: (m: number) => void; onOtro: () => void; etiqueta: (m: number) => string }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
      {montos.map((m) => (
        <Chip key={m} texto={etiqueta(m)} elegido={false} onPress={() => onAbonar(m)} />
      ))}
      <Chip texto={t('planPersonal.otroMonto')} elegido={false} onPress={onOtro} />
    </View>
  );
}

function useCorto() {
  const perfil = usePerfil();
  const separador = paisPorCodigo(perfil?.country ?? 'CO').separador;
  return (v: number) => formatearCorto(v, separador);
}

// ───────────────────────────── Metas ─────────────────────────────

export function VistaMetas({ metas, metaSugerida, alCambiar }: Comun & { metas: Meta[]; metaSugerida: { nombre: string; valor: number } | null }) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const corto = useCorto();
  const [editando, setEditando] = useState<Meta | 'nueva' | null>(null);
  const [abonando, setAbonando] = useState<Meta | null>(null);

  async function abonar(meta: Meta, monto: number) {
    const r = await abonarMeta(meta.id, monto);
    if (!r.error) alCambiar(meta.ahorrado + monto >= meta.objetivo ? t('planPersonal.metas.cumplida') : t('planPersonal.metas.abonado', { monto: plata(monto), meta: meta.nombre }));
    return r;
  }

  return (
    <>
      <Texto variante="suave">{t('planPersonal.metas.detalle')}</Texto>

      {metas.length === 0 && metaSugerida && (
        <View style={{ gap: ESPACIO.s, padding: ESPACIO.l, borderRadius: 20, backgroundColor: colores.seleccionado }}>
          <Texto>{t('planPersonal.metas.sugerencia', { nombre: metaSugerida.nombre })}</Texto>
          <Boton
            titulo={t('planPersonal.metas.sugerenciaBoton', { nombre: metaSugerida.nombre })}
            onPress={async () => {
              const r = await guardarMeta({ nombre: metaSugerida.nombre, emoji: 'diana', objetivo: metaSugerida.valor, ahorrado: 0 });
              if (!r.error) alCambiar();
            }}
          />
        </View>
      )}
      {metas.length === 0 && !metaSugerida && <Texto variante="suave">{t('planPersonal.metas.vacio')}</Texto>}

      {metas.map((m) => {
        const r = resumenMeta(m);
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityHint={t('planPersonal.metas.editar')}
            onPress={() => setEditando(m)}
            style={({ pressed }) => [{ gap: ESPACIO.s + 4, padding: ESPACIO.m, borderRadius: 20, backgroundColor: colores.tarjeta, transform: [{ scale: pressed ? 0.98 : 1 }] }, sombraSuave(oscuro)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4 }}>
              <Emoji name={m.emoji as NombreEmoji} size={36} />
              <View style={{ flex: 1 }}>
                <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 21 }}>{m.nombre}</Texto>
                <Texto variante="pequeno" color={r.cumplida ? colores.ingresoTexto : undefined}>
                  {r.cumplida
                    ? t('planPersonal.metas.cumplida')
                    : t('planPersonal.metas.progreso', { ahorrado: plata(m.ahorrado), objetivo: plata(m.objetivo), faltan: corto(r.faltan) })}
                </Texto>
              </View>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 18, lineHeight: 24 }} color={r.cumplida ? colores.ingresoTexto : colores.enlace}>
                {r.porcentaje}%
              </Texto>
            </View>
            <Barra valor={r.porcentaje / 100} color={r.cumplida ? colores.ingreso : colores.accion} alto={10} />
            {!r.cumplida && (
              <BotonesAbono montos={[100_000, 500_000]} etiqueta={(v) => t('planPersonal.rapido', { monto: corto(v) })} onAbonar={(v) => abonar(m, v)} onOtro={() => setAbonando(m)} />
            )}
          </Pressable>
        );
      })}

      <Boton titulo={`+ ${t('planPersonal.metas.crear')}`} variante="secundario" onPress={() => setEditando('nueva')} />

      <HojaItem
        abierta={editando !== null}
        titulo={editando === 'nueva' ? t('planPersonal.metas.nueva') : t('planPersonal.metas.editar')}
        ejemplo={t('planPersonal.metas.ejemplos')}
        emojis={EMOJIS_METAS}
        campos={[
          { clave: 'objetivo', etiqueta: t('planPersonal.metas.objetivo'), tipo: 'plata', obligatorio: true },
          { clave: 'ahorrado', etiqueta: t('planPersonal.metas.ahorrado'), tipo: 'plata' },
        ]}
        inicial={editando && editando !== 'nueva' ? { nombre: editando.nombre, emoji: editando.emoji, montos: { objetivo: editando.objetivo, ahorrado: editando.ahorrado } } : undefined}
        onCerrar={() => setEditando(null)}
        onGuardar={async (v) => {
          const r = await guardarMeta(
            { nombre: v.nombre, emoji: v.emoji, objetivo: v.montos.objetivo ?? 0, ahorrado: v.montos.ahorrado ?? 0 },
            editando && editando !== 'nueva' ? editando.id : undefined,
          );
          if (!r.error) {
            setEditando(null);
            alCambiar();
          }
          return r;
        }}
        onBorrar={
          editando && editando !== 'nueva'
            ? async () => {
                const r = await borrarDelPlan('goals', editando.id);
                if (!r.error) {
                  setEditando(null);
                  alCambiar();
                }
                return r;
              }
            : undefined
        }
      />
      <HojaAbono
        abierta={!!abonando}
        titulo={abonando?.nombre ?? ''}
        emoji={abonando?.emoji ?? 'diana'}
        onCerrar={() => setAbonando(null)}
        onAbonar={async (monto) => {
          const r = abonando ? await abonar(abonando, monto) : { error: null };
          if (!r.error) setAbonando(null);
          return r;
        }}
      />
    </>
  );
}

// ───────────────────────────── Deudas ─────────────────────────────

export function VistaDeudas({ deudas, alCambiar }: Comun & { deudas: Deuda[] }) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const corto = useCorto();
  const [editando, setEditando] = useState<Deuda | 'nueva' | null>(null);
  const [abonando, setAbonando] = useState<Deuda | null>(null);
  const resumen = resumenDeudas(deudas);

  async function abonar(deuda: Deuda, monto: number) {
    const r = await abonarDeuda(deuda.id, monto);
    if (!r.error) alCambiar(deuda.saldo - monto <= 0 ? t('planPersonal.deudas.saldada') : t('planPersonal.deudas.abonado', { monto: plata(monto), deuda: deuda.nombre }));
    return r;
  }

  return (
    <>
      <Texto variante="suave">{t('planPersonal.deudas.detalle')}</Texto>

      {deudas.length > 0 && (
        <Tarjeta>
          <Texto variante="etiqueta">{t('planPersonal.deudas.total')}</Texto>
          <Texto variante="cifra" color={resumen.total > 0 ? colores.errorTexto : colores.ingresoTexto}>
            {plata(resumen.total)}
          </Texto>
          <Texto variante="pequeno">{t('planPersonal.deudas.intereses', { monto: plata(Math.round(resumen.interesesMes)) })}</Texto>
        </Tarjeta>
      )}

      {deudas.length > 0 && (
        <View style={{ flexDirection: 'row', gap: ESPACIO.m, alignItems: 'flex-start', padding: ESPACIO.l, borderRadius: 20, backgroundColor: colores.seleccionado }}>
          <Emoji name="bombillo" size={28} />
          <Texto style={{ flex: 1 }}>
            {resumen.prioritaria
              ? t('planPersonal.deudas.consejo', { nombre: resumen.prioritaria.nombre, tasa: resumen.prioritaria.tasaEA })
              : t('planPersonal.deudas.sinDeudas')}
          </Texto>
        </View>
      )}
      {deudas.length === 0 && <Texto variante="suave">{t('planPersonal.deudas.vacio')}</Texto>}

      {deudas.map((d) => {
        const esPrimera = resumen.prioritaria?.id === d.id;
        return (
          <Pressable
            key={d.id}
            accessibilityRole="button"
            accessibilityHint={t('planPersonal.deudas.editar')}
            onPress={() => setEditando(d)}
            style={({ pressed }) => [
              {
                gap: ESPACIO.s + 4,
                padding: ESPACIO.m,
                borderRadius: 20,
                backgroundColor: colores.tarjeta,
                borderWidth: 2,
                borderColor: esPrimera ? colores.accion : 'transparent',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
              sombraSuave(oscuro),
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4 }}>
              <Emoji name={d.emoji as NombreEmoji} size={36} />
              <View style={{ flex: 1 }}>
                <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 21 }}>{d.nombre}</Texto>
                <Texto variante="pequeno">
                  {d.tasaEA > 0 ? t('planPersonal.deudas.detalleFila', { tasa: d.tasaEA, cuota: corto(d.cuota) }) : t('planPersonal.deudas.sinIntereses')}
                </Texto>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 17, lineHeight: 22 }} color={d.saldo === 0 ? colores.ingresoTexto : colores.texto}>
                  {d.saldo === 0 ? t('planPersonal.deudas.saldada') : plata(d.saldo)}
                </Texto>
                {esPrimera && (
                  <View style={{ paddingHorizontal: ESPACIO.s + 2, paddingVertical: 3, borderRadius: 999, backgroundColor: colores.seleccionado }}>
                    <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 12, lineHeight: 16 }} color={colores.enlace}>
                      {t('planPersonal.deudas.primero')}
                    </Texto>
                  </View>
                )}
              </View>
            </View>
            {d.saldo > 0 && (
              <BotonesAbono
                montos={[200_000, 1_000_000]}
                etiqueta={(v) => t('planPersonal.rapido', { monto: corto(v) })}
                onAbonar={(v) => abonar(d, v)}
                onOtro={() => setAbonando(d)}
              />
            )}
          </Pressable>
        );
      })}

      <Boton titulo={`+ ${t('planPersonal.deudas.agregar')}`} variante="secundario" onPress={() => setEditando('nueva')} />

      <HojaItem
        abierta={editando !== null}
        titulo={editando === 'nueva' ? t('planPersonal.deudas.nueva') : t('planPersonal.deudas.editar')}
        ejemplo={t('planPersonal.deudas.ejemplos')}
        emojis={EMOJIS_DEUDAS}
        campos={[
          { clave: 'saldo', etiqueta: t('planPersonal.deudas.saldo'), tipo: 'plata', obligatorio: true },
          { clave: 'tasa', etiqueta: t('planPersonal.deudas.tasa'), ayuda: t('planPersonal.deudas.tasaAyuda'), tipo: 'porcentaje' },
          { clave: 'cuota', etiqueta: t('planPersonal.deudas.cuota'), tipo: 'plata' },
        ]}
        inicial={editando && editando !== 'nueva' ? { nombre: editando.nombre, emoji: editando.emoji, montos: { saldo: editando.saldo, tasa: editando.tasaEA, cuota: editando.cuota } } : undefined}
        onCerrar={() => setEditando(null)}
        onGuardar={async (v) => {
          const r = await guardarDeuda(
            { nombre: v.nombre, emoji: v.emoji, saldo: v.montos.saldo ?? 0, tasaEA: v.montos.tasa ?? 0, cuota: v.montos.cuota ?? 0 },
            editando && editando !== 'nueva' ? editando.id : undefined,
          );
          if (!r.error) {
            setEditando(null);
            alCambiar();
          }
          return r;
        }}
        onBorrar={
          editando && editando !== 'nueva'
            ? async () => {
                const r = await borrarDelPlan('debts', editando.id);
                if (!r.error) {
                  setEditando(null);
                  alCambiar();
                }
                return r;
              }
            : undefined
        }
      />
      <HojaAbono
        abierta={!!abonando}
        titulo={abonando?.nombre ?? ''}
        emoji={abonando?.emoji ?? 'tarjeta'}
        onCerrar={() => setAbonando(null)}
        onAbonar={async (monto) => {
          const r = abonando ? await abonar(abonando, monto) : { error: null };
          if (!r.error) setAbonando(null);
          return r;
        }}
      />
    </>
  );
}

// ───────────────────────────── Patrimonio ─────────────────────────────

export function VistaPatrimonio({ activos, metas, deudas, fotos, alCambiar }: Comun & { activos: Activo[]; metas: Meta[]; deudas: Deuda[]; fotos: Foto[] }) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const plata = usePlata();
  const corto = useCorto();
  const textosFecha = useTextosFecha();
  const [editando, setEditando] = useState<Activo | 'nuevo' | null>(null);
  const actual = patrimonioActual(activos, metas, deudas);
  const paleta = oscuro ? COLORES_GRAFICA.oscuro : COLORES_GRAFICA.claro;

  // La foto del mes actual siempre refleja lo de hoy.
  const hoy = hoyEn();
  const fotosConHoy = [...fotos.filter((f) => f.mes !== hoy.slice(0, 7)), { mes: hoy.slice(0, 7), neto: actual.neto }];
  const serie = serieDePatrimonio(fotosConHoy, hoy, 6);
  const maximo = Math.max(1, ...serie.map((s) => Math.abs(s.neto ?? 0)));

  const filaTotal = (etiqueta: string, valor: number, color?: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: ESPACIO.s }}>
      <Texto variante="medio">{etiqueta}</Texto>
      <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }} color={color}>
        {plata(valor)}
      </Texto>
    </View>
  );

  return (
    <>
      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="medio" color={colores.textoSuave}>
          {t('planPersonal.patrimonio.neto')}
        </Texto>
        <Texto variante="heroe" color={actual.neto < 0 ? colores.errorTexto : colores.ingresoTexto} numberOfLines={1} adjustsFontSizeToFit>
          {actual.neto < 0 ? `−${plata(-actual.neto)}` : plata(actual.neto)}
        </Texto>
        <Texto variante="suave">{t('planPersonal.patrimonio.detalle')}</Texto>
      </View>

      {/* Evolución de los últimos 6 meses: una barra por mes; en rojo si fue negativo */}
      <Tarjeta>
        <Texto variante="subtitulo">{t('planPersonal.patrimonio.evolucion')}</Texto>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: ESPACIO.s }}>
          {serie.map((s, i) => {
            const alto = s.neto === null ? 0 : Math.max(6, (Math.abs(s.neto) / maximo) * 100);
            const ultimo = i === serie.length - 1;
            return (
              <View key={s.mes} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }} accessibilityLabel={s.neto === null ? s.mes : `${s.mes}: ${plata(s.neto)}`}>
                {s.neto !== null && (
                  <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 11, lineHeight: 14 }} color={ultimo ? colores.texto : colores.textoSuave}>
                    {s.neto < 0 ? '−' : ''}
                    {corto(Math.abs(s.neto))}
                  </Texto>
                )}
                <View style={{ width: '70%', height: alto, borderRadius: 6, backgroundColor: s.neto !== null && s.neto < 0 ? colores.error : ultimo ? paleta.gasto : paleta.gastoSuave }} />
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: ESPACIO.s }}>
          {serie.map((s) => (
            <Texto key={s.mes} variante="pequeno" style={{ flex: 1, textAlign: 'center' }}>
              {textosFecha.mesesCortos[Number(s.mes.slice(5, 7)) - 1].replace(/^./, (l) => l.toUpperCase())}
            </Texto>
          ))}
        </View>
      </Tarjeta>

      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="subtitulo">{t('planPersonal.patrimonio.loQueTienes')}</Texto>
        {activos.length === 0 && <Texto variante="suave">{t('planPersonal.patrimonio.vacio')}</Texto>}
        <View style={[{ backgroundColor: colores.tarjeta, borderRadius: 20, paddingHorizontal: ESPACIO.m, paddingVertical: ESPACIO.xs }, sombraSuave(oscuro)]}>
          {activos.map((a) => (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              onPress={() => setEditando(a)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 60, opacity: pressed ? 0.7 : 1 })}>
              <Emoji name={a.emoji as NombreEmoji} size={30} />
              <Texto variante="fuerte" style={{ flex: 1 }}>
                {a.nombre}
              </Texto>
              <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }}>{plata(a.valor)}</Texto>
            </Pressable>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: 60 }}>
            <Emoji name="diana" size={30} />
            <Texto variante="fuerte" style={{ flex: 1 }}>
              {t('planPersonal.patrimonio.ahorradoMetas')}
            </Texto>
            <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 22 }}>{plata(actual.ahorradoEnMetas)}</Texto>
          </View>
        </View>
        <Boton titulo={`+ ${t('planPersonal.patrimonio.agregar')}`} variante="secundario" onPress={() => setEditando('nuevo')} />
      </View>

      <Tarjeta style={{ gap: 0 }}>
        {filaTotal(t('planPersonal.patrimonio.totalTienes'), actual.activos + actual.ahorradoEnMetas, colores.ingresoTexto)}
        {filaTotal(t('planPersonal.patrimonio.totalDebes'), actual.deudas, actual.deudas > 0 ? colores.errorTexto : undefined)}
      </Tarjeta>

      <HojaItem
        abierta={editando !== null}
        titulo={editando === 'nuevo' ? t('planPersonal.patrimonio.nuevo') : t('planPersonal.patrimonio.editar')}
        ejemplo={t('planPersonal.patrimonio.ejemplos')}
        emojis={EMOJIS_ACTIVOS}
        campos={[{ clave: 'valor', etiqueta: t('planPersonal.patrimonio.valor'), tipo: 'plata', obligatorio: true }]}
        inicial={editando && editando !== 'nuevo' ? { nombre: editando.nombre, emoji: editando.emoji, montos: { valor: editando.valor } } : undefined}
        onCerrar={() => setEditando(null)}
        onGuardar={async (v) => {
          const r = await guardarActivo({ nombre: v.nombre, emoji: v.emoji, valor: v.montos.valor ?? 0 }, editando && editando !== 'nuevo' ? editando.id : undefined);
          if (!r.error) {
            setEditando(null);
            alCambiar();
          }
          return r;
        }}
        onBorrar={
          editando && editando !== 'nuevo'
            ? async () => {
                const r = await borrarDelPlan('assets', editando.id);
                if (!r.error) {
                  setEditando(null);
                  alCambiar();
                }
                return r;
              }
            : undefined
        }
      />
    </>
  );
}
