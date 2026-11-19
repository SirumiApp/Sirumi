import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { leerArchivoTabla } from '@/ajustes/archivos';
import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Chip } from '@/components/Chip';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { SoloSi } from '@/components/SoloSi';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { cargarExtractos, deshacerImportacion, importarExtracto, movimientosPersonalesEntre, type Ambito, type Extracto } from '@/extractos/datos';
import { ajusteSaldoInicial, etiquetaMes, leerExtracto, marcarDuplicados, sugerirCategoria, sugerirTipo, type Columnas, type MovExtracto } from '@/lib/extractos';
import { ORDEN_TIPOS, TIPOS_NEGOCIO, type TipoNegocio } from '@/lib/negocio';
import { useNegocio } from '@/negocio/contexto';
import { conSigno } from '@/negocio/Piezas';
import { usePersonal } from '@/personal/contexto';
import { fechaCorta } from '@/personal/etiquetas';
import { useNombreCategoria, usePlata, useTextosFecha } from '@/personal/ganchos';
import { ALTO_TOCABLE, ESPACIO, useTema } from '@/theme';

type Fila = MovExtracto & { elegida: boolean; duplicada: boolean; tipo: TipoNegocio; categoria: string | null };
type Lectura = { archivo: string; tabla: (string | number)[][]; filas: Fila[]; sinLeer: number };
type Rol = 'fecha' | 'descripcion' | 'valor' | 'debito' | 'credito';

const POR_PAGINA = 40;
/** Que "$ 1.850.000" no se parta en dos renglones. */
const sinCorte = (texto: string) => texto.replace(/ /g, '\u00A0');

/** B9 · Subir el extracto del banco (CSV o Excel) por cuenta y mes, en el negocio o en personal. */
export default function PantallaExtractos() {
  const { ambito } = useLocalSearchParams<{ ambito?: string }>();
  const cual: Ambito = ambito === 'personal' ? 'personal' : 'negocio';
  return (
    <SoloSi parte={cual} soloDueno={cual === 'negocio'}>
      <Extractos ambito={cual} />
    </SoloSi>
  );
}

function Extractos({ ambito }: { ambito: Ambito }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const nombreCategoria = useNombreCategoria();
  const ejemplo = useModoEjemplo();
  const negocioCtx = useNegocio();
  const personal = usePersonal();
  const { negocio, cuentas, movimientos } = negocioCtx;
  const enNegocio = ambito === 'negocio';

  const [cuenta, setCuenta] = useState<string | null>(null);
  const cuentaElegida = cuenta ?? cuentas.find((c) => c.principal)?.id ?? cuentas[0]?.id ?? null;
  const [historial, setHistorial] = useState<Extracto[]>([]);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [manual, setManual] = useState<Partial<Record<Rol, number | null>> | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'error' | 'info' } | null>(null);

  const recargar = useCallback(async () => setHistorial(await cargarExtractos(ambito, negocio?.id ?? null)), [ambito, negocio?.id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor
    recargar();
  }, [recargar]);

  const nombreCuenta = useCallback((id: string | null) => cuentas.find((c) => c.id === id)?.nombre ?? t('extractos.personal'), [cuentas, t]);
  const nombreMes = (mes: string) => {
    const [anio, m] = mes.split('-').map(Number);
    return m ? `${textosFecha.mesesLargos[m - 1]} ${anio}` : mes;
  };
  const categoriasDe = (monto: number) => personal.categorias.filter((c) => !c.hidden && c.kind === (monto > 0 ? 'ingreso' : 'gasto'));

  /** Convierte lo leído en filas para revisar: tipo o categoría sugerida y duplicados sin marcar (B9). */
  async function preparar(archivo: string, tabla: (string | number)[][], columnas?: Columnas) {
    const r = leerExtracto(tabla, columnas);
    if (!r.columnas) {
      setManual({});
      setLectura({ archivo, tabla, filas: [], sinLeer: 0 });
      return;
    }
    if (r.movimientos.length === 0) {
      setAviso({ texto: t('extractos.sinMovimientos'), tipo: 'error' });
      setLectura(null);
      return;
    }
    let existentes: { fecha: string; monto: number }[];
    if (enNegocio) {
      existentes = movimientos
        .filter((m) => m.pagado && !m.tarjeta && m.cuenta === cuentaElegida)
        .map((m) => ({ fecha: m.fecha, monto: TIPOS_NEGOCIO[m.tipo].entra ? m.monto : -m.monto }));
    } else {
      const fechas = r.movimientos.map((m) => m.fecha).sort();
      existentes = await movimientosPersonalesEntre(fechas[0], fechas[fechas.length - 1]);
    }
    const duplicados = marcarDuplicados(r.movimientos, existentes);
    const porClave = new Map(personal.categorias.filter((c) => c.key).map((c) => [c.key as string, c.id]));
    setLectura({
      archivo,
      tabla,
      sinLeer: r.sinLeer,
      filas: r.movimientos.map((m, i) => {
        const clave = sugerirCategoria(m.descripcion, m.monto);
        return {
          ...m,
          duplicada: duplicados[i],
          elegida: !duplicados[i],
          tipo: sugerirTipo(m.descripcion, m.monto),
          categoria: (clave && porClave.get(clave)) ?? null,
        };
      }),
    });
    setManual(null);
    setPagina(1);
  }

  async function elegirArchivo() {
    setAviso(null);
    try {
      const r = await leerArchivoTabla();
      if (!r) return;
      await preparar(r.nombre, r.filas);
    } catch (e) {
      setAviso({ texto: t(e instanceof Error && e.message === 'xls' ? 'extractos.errorXls' : 'extractos.errorArchivo'), tipo: 'error' });
    }
  }

  // Si no encontramos las columnas solas, la persona escoge cuál es cuál a partir de la primera fila con títulos.
  const filaTitulos = lectura ? Math.max(0, lectura.tabla.findIndex((f) => f.filter((c) => String(c ?? '').trim() !== '').length >= 2)) : 0;
  const titulos = lectura ? (lectura.tabla[filaTitulos] ?? []).map((c, i) => String(c ?? '').trim() || t('extractos.columna', { n: i + 1 })) : [];

  function leerManual() {
    if (!lectura || !manual || manual.fecha == null) return;
    if (manual.valor == null && manual.debito == null && manual.credito == null) return;
    preparar(lectura.archivo, lectura.tabla, {
      fila: filaTitulos,
      fecha: manual.fecha,
      descripcion: manual.descripcion ?? null,
      valor: manual.valor ?? null,
      debito: manual.debito ?? null,
      credito: manual.credito ?? null,
    });
  }

  const cambiarFila = (i: number, cambio: Partial<Fila>) => setLectura((l) => (l ? { ...l, filas: l.filas.map((f, j) => (j === i ? { ...f, ...cambio } : f)) } : l));
  const elegidas = useMemo(() => lectura?.filas.filter((f) => f.elegida) ?? [], [lectura]);
  const entran = elegidas.filter((f) => f.monto > 0).reduce((s, f) => s + f.monto, 0);
  const salen = elegidas.filter((f) => f.monto < 0).reduce((s, f) => s - f.monto, 0);
  const mes = etiquetaMes(elegidas.map((f) => f.fecha));
  const ajuste = ajusteSaldoInicial(elegidas.map((f) => f.monto));

  async function importar() {
    if (ejemplo) return avisarEjemplo();
    if (!lectura || elegidas.length === 0 || (enNegocio && !cuentaElegida)) return;
    setGuardando(true);
    const { error } = await importarExtracto({
      ambito,
      negocioId: negocio?.id ?? null,
      cuenta: enNegocio ? cuentaElegida : null,
      mes,
      archivo: lectura.archivo,
      filas: elegidas.map((f) => ({ fecha: f.fecha, descripcion: f.descripcion, monto: f.monto, tipo: enNegocio ? f.tipo : undefined, categoria: enNegocio ? null : f.categoria })),
    });
    setGuardando(false);
    if (error) return setAviso({ texto: t('extractos.errorImportar'), tipo: 'error' });
    setAviso({ texto: t('extractos.listo', { count: elegidas.length, nombre: enNegocio ? `${nombreCuenta(cuentaElegida)} · ${nombreMes(mes)}` : nombreMes(mes) }), tipo: 'info' });
    setLectura(null);
    if (enNegocio) negocioCtx.actualizar();
    else personal.actualizar();
    recargar();
  }

  function preguntarDeshacer(e: Extracto) {
    Alert.alert(t('extractos.deshacer'), t('extractos.confirmarDeshacer', { count: e.filas }), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      {
        text: t('extractos.siDeshacer'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await deshacerImportacion(e.id);
          if (error) return setAviso({ texto: t('extractos.errorImportar'), tipo: 'error' });
          if (enNegocio) negocioCtx.actualizar();
          else personal.actualizar();
          recargar();
        },
      },
    ]);
  }

  const tiposPara = (monto: number) => ORDEN_TIPOS.filter((tp) => TIPOS_NEGOCIO[tp].entra === monto > 0);

  return (
    <PantallaAjuste titulo={t('extractos.titulo')} detalle={t(enNegocio ? 'extractos.detalleNegocio' : 'extractos.detallePersonal')}>
      {!lectura && (
        <>
          <Tarjeta style={{ gap: ESPACIO.xs }}>
            <Texto variante="fuerte">{t('extractos.comoTitulo')}</Texto>
            <Texto variante="pequeno">{t('extractos.como')}</Texto>
          </Tarjeta>
          {enNegocio && (
            <View style={{ gap: ESPACIO.s }}>
              <Texto variante="etiqueta">{t('extractos.deQueCuenta')}</Texto>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
                {cuentas.map((c) => (
                  <Chip key={c.id} texto={c.nombre} elegido={c.id === cuentaElegida} onPress={() => setCuenta(c.id)} />
                ))}
              </View>
              <Texto variante="pequeno" color={colores.textoSuave}>
                {t('extractos.tarjetasLuego')}
              </Texto>
            </View>
          )}
          <Boton titulo={t('extractos.subir')} onPress={elegirArchivo} disabled={enNegocio && !cuentaElegida} />
        </>
      )}

      {aviso && <Aviso mensaje={aviso.texto} tipo={aviso.tipo} />}

      {lectura && manual && (
        <Tarjeta style={{ gap: ESPACIO.s }}>
          <Texto variante="subtitulo">{t('extractos.manualTitulo')}</Texto>
          <Texto variante="pequeno">{t('extractos.manualDetalle')}</Texto>
          {(['fecha', 'descripcion', 'valor', 'debito', 'credito'] as const).map((rol) => (
            <View key={rol} style={{ gap: ESPACIO.xs }}>
              <Texto variante="etiqueta">{t(`extractos.roles.${rol}`)}</Texto>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: ESPACIO.s }}>
                {rol !== 'fecha' && <Chip texto={t('extractos.ninguna')} elegido={manual[rol] == null} onPress={() => setManual({ ...manual, [rol]: null })} />}
                {titulos.map((titulo, i) => (
                  <Chip key={i} texto={titulo} elegido={manual[rol] === i} onPress={() => setManual({ ...manual, [rol]: i })} />
                ))}
              </ScrollView>
            </View>
          ))}
          <Boton
            titulo={t('extractos.leer')}
            onPress={leerManual}
            disabled={manual.fecha == null || (manual.valor == null && manual.debito == null && manual.credito == null)}
          />
          <Boton titulo={t('extractos.otroArchivo')} variante="texto" onPress={() => setLectura(null)} />
        </Tarjeta>
      )}

      {lectura && !manual && (
        <>
          <Tarjeta style={{ gap: ESPACIO.xs }}>
            <Texto variante="etiqueta">{enNegocio ? `${nombreCuenta(cuentaElegida)} · ${nombreMes(mes)}` : nombreMes(mes)}</Texto>
            <Texto variante="subtitulo">{t('extractos.elegidos', { count: elegidas.length, total: lectura.filas.length })}</Texto>
            <View style={{ flexDirection: 'row', gap: ESPACIO.m }}>
              <View style={{ flex: 1 }}>
                <Texto variante="etiqueta">{t('extractos.entran')}</Texto>
                <Texto variante="fuerte" color={colores.ingresoTexto}>
                  {plata(entran)}
                </Texto>
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="etiqueta">{t('extractos.salen')}</Texto>
                <Texto variante="fuerte">{plata(salen)}</Texto>
              </View>
            </View>
            {lectura.filas.some((f) => f.duplicada) && <Texto variante="pequeno">{t('extractos.hayDuplicados', { count: lectura.filas.filter((f) => f.duplicada).length })}</Texto>}
            {lectura.sinLeer > 0 && <Texto variante="pequeno">{t('extractos.sinLeer', { count: lectura.sinLeer })}</Texto>}
            {enNegocio && elegidas.length > 0 && (
              <Texto variante="pequeno" color={colores.textoSuave}>
                {t('extractos.saldoNoCambia', { cuenta: nombreCuenta(cuentaElegida), monto: conSigno(plata, ajuste) })}
              </Texto>
            )}
          </Tarjeta>

          <View style={{ gap: ESPACIO.s }}>
            {lectura.filas.slice(0, pagina * POR_PAGINA).map((f, i) => {
              const cat = personal.categorias.find((c) => c.id === f.categoria);
              const etiqueta = enNegocio ? t(`negocioApp.tipos.${f.tipo}.nombre`) : nombreCategoria(cat);
              return (
                <Tarjeta key={`${f.fila}-${i}`} style={{ gap: ESPACIO.s, opacity: f.elegida ? 1 : 0.55 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: f.elegida }}
                      accessibilityLabel={f.descripcion || t('extractos.sinDescripcion')}
                      onPress={() => cambiarFila(i, { elegida: !f.elegida })}
                      hitSlop={8}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: f.elegida ? colores.accion : colores.borde,
                        backgroundColor: f.elegida ? colores.accion : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {f.elegida && (
                        <Texto variante="fuerte" color={colores.textoSobreAccion}>
                          ✓
                        </Texto>
                      )}
                    </Pressable>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Texto variante="fuerte" numberOfLines={1}>
                        {f.descripcion || t('extractos.sinDescripcion')}
                      </Texto>
                      <Texto variante="pequeno">
                        {[fechaCorta(f.fecha, textosFecha, true), f.duplicada ? t('extractos.yaEsta') : null].filter(Boolean).join(' · ')}
                      </Texto>
                    </View>
                    <Texto variante="fuerte" color={f.monto > 0 ? colores.ingresoTexto : colores.texto}>
                      {f.monto > 0 ? `+${plata(f.monto)}` : conSigno(plata, f.monto)}
                    </Texto>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('extractos.cambiarTipo', { tipo: etiqueta })}
                    onPress={() => setAbierta(abierta === i ? null : i)}
                    style={{ alignSelf: 'flex-start', minHeight: ALTO_TOCABLE, justifyContent: 'center' }}
                  >
                    <View style={{ paddingHorizontal: ESPACIO.m, paddingVertical: ESPACIO.xs + 2, borderRadius: 999, backgroundColor: colores.relleno }}>
                      <Texto variante="pequeno" color={colores.texto}>
                        {etiqueta} ▾
                      </Texto>
                    </View>
                  </Pressable>
                  {abierta === i && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
                      {enNegocio
                        ? tiposPara(f.monto).map((tp) => (
                            <Chip
                              key={tp}
                              texto={t(`negocioApp.tipos.${tp}.nombre`)}
                              elegido={f.tipo === tp}
                              onPress={() => {
                                cambiarFila(i, { tipo: tp });
                                setAbierta(null);
                              }}
                            />
                          ))
                        : [
                            <Chip key="sin" texto={t('categorias.sinCategoria')} elegido={!f.categoria} onPress={() => (cambiarFila(i, { categoria: null }), setAbierta(null))} />,
                            ...categoriasDe(f.monto).map((c) => (
                              <Chip key={c.id} texto={nombreCategoria(c)} elegido={f.categoria === c.id} onPress={() => (cambiarFila(i, { categoria: c.id }), setAbierta(null))} />
                            )),
                          ]}
                    </View>
                  )}
                </Tarjeta>
              );
            })}
            {lectura.filas.length > pagina * POR_PAGINA && (
              <Boton titulo={t('extractos.verMas', { count: lectura.filas.length - pagina * POR_PAGINA })} variante="secundario" onPress={() => setPagina(pagina + 1)} />
            )}
          </View>

          <Boton titulo={t('extractos.importar', { count: elegidas.length })} onPress={importar} cargando={guardando} disabled={elegidas.length === 0} />
          <Boton titulo={t('extractos.otroArchivo')} variante="texto" onPress={() => setLectura(null)} />
        </>
      )}

      {!lectura && historial.length > 0 && (
        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="subtitulo">{t('extractos.subidos')}</Texto>
          {historial.map((e) => (
            <Tarjeta key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Texto variante="fuerte" numberOfLines={1}>
                  {enNegocio ? `${nombreCuenta(e.cuenta)} · ${nombreMes(e.mes)}` : nombreMes(e.mes)}
                </Texto>
                <Texto variante="pequeno">{t('extractos.resumenSubido', { count: e.filas, entran: sinCorte(plata(e.entradas)), salen: sinCorte(plata(e.salidas)) })}</Texto>
              </View>
              <Boton titulo={t('extractos.deshacer')} variante="texto" onPress={() => preguntarDeshacer(e)} />
            </Tarjeta>
          ))}
        </View>
      )}
    </PantallaAjuste>
  );
}
