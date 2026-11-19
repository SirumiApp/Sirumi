import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { Casilla } from '@/components/Casilla';
import { Chip } from '@/components/Chip';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { useTributario } from '@/impuestos/ganchos';
import { CampoCantidad } from '@/inventario/Piezas';
import { ajusteDeArqueo, DENOMINACIONES_CO, resultadoArqueo, totalDenominaciones } from '@/lib/arqueo';
import { hoyEn } from '@/lib/fechas';
import { saldoCuenta } from '@/lib/negocio';
import { etiquetaDia } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { ESPACIO, useTema } from '@/theme';

import { cargarArqueos, registrarArqueo, type Arqueo } from './arqueoDatos';
import { useNegocio } from './contexto';
import { conSigno, FilaCifra, ListaFilas } from './Piezas';

/** D10 · Contar la caja al cerrar el día: lo que hay en efectivo contra lo que debería haber. */
export function ArqueoCaja() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const { colombia } = useTributario();
  const { negocio, cuentas, movimientos, traslados, actualizar } = useNegocio();
  const efectivos = cuentas.filter((c) => c.tipo === 'efectivo');
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const cuenta = efectivos.find((c) => c.id === cuentaId) ?? efectivos[0];
  const [modo, setModo] = useState<'total' | 'billetes'>('total');
  const [total, setTotal] = useState(0);
  const [billetes, setBilletes] = useState<Record<number, number>>({});
  // Desmarcada: una diferencia grande suele ser algo sin registrar; mejor revisar antes de ajustar.
  const [ajustar, setAjustar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'error' | 'info' } | null>(null);
  const [historial, setHistorial] = useState<Arqueo[]>([]);

  const recargar = useCallback(async () => negocio && setHistorial(await cargarArqueos(negocio.id)), [negocio]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga desde el servidor
    recargar();
  }, [recargar]);

  if (!negocio || !cuenta) return null;
  const esperado = saldoCuenta({ id: cuenta.id, saldoInicial: cuenta.saldoInicial }, movimientos, traslados);
  const contado = modo === 'billetes' ? totalDenominaciones(billetes) : total;
  const contó = modo === 'billetes' ? Object.values(billetes).some((n) => n > 0) : total > 0;
  const r = resultadoArqueo(esperado, contado);
  const ajuste = ajusteDeArqueo(r.diferencia);
  const colorEstado = r.estado === 'cuadra' ? colores.ingresoTexto : r.estado === 'sobra' ? colores.avisoTexto : colores.errorTexto;
  const nombre = (id: string) => cuentas.find((c) => c.id === id)?.nombre ?? '—';

  async function guardar() {
    if (!negocio || !cuenta) return;
    setGuardando(true);
    setAviso(null);
    const { error } = await registrarArqueo({
      negocioId: negocio.id,
      cuenta: cuenta.id,
      fecha: hoyEn(),
      esperado,
      contado,
      ajustar: ajustar && !!ajuste,
      textos: { faltante: t('arqueo.faltanteConcepto'), sobrante: t('arqueo.sobranteConcepto') },
    });
    setGuardando(false);
    if (error) return setAviso({ texto: t('arqueo.error'), tipo: 'error' });
    setAviso({ texto: t('arqueo.guardado'), tipo: 'info' });
    setTotal(0);
    setBilletes({});
    actualizar();
    recargar();
  }

  return (
    <Tarjeta style={{ gap: ESPACIO.m }}>
      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="subtitulo">{t('arqueo.titulo')}</Texto>
        <Texto variante="pequeno">{t('arqueo.detalle')}</Texto>
      </View>
      {efectivos.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
          {efectivos.map((c) => (
            <Chip key={c.id} texto={c.nombre} elegido={c.id === cuenta.id} onPress={() => setCuentaId(c.id)} />
          ))}
        </View>
      )}
      <FilaCifra titulo={t('arqueo.deberia', { cuenta: cuenta.nombre })} ayuda={t('arqueo.deberiaAyuda')} valor={plata(esperado)} fuerte />
      {colombia && (
        <View style={{ flexDirection: 'row', gap: ESPACIO.s }}>
          <Chip texto={t('arqueo.modos.total')} elegido={modo === 'total'} onPress={() => setModo('total')} />
          <Chip texto={t('arqueo.modos.billetes')} elegido={modo === 'billetes'} onPress={() => setModo('billetes')} />
        </View>
      )}
      {modo === 'total' ? (
        <CampoDinero etiqueta={t('arqueo.contado')} valor={total} onCambio={setTotal} />
      ) : (
        <View style={{ gap: ESPACIO.xs }}>
          {DENOMINACIONES_CO.map((d) => (
            <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
              <Texto variante="fuerte" style={{ flex: 1 }}>
                {plata(d)}
              </Texto>
              <CampoCantidad etiqueta={plata(d)} valor={billetes[d] ?? 0} onCambio={(n) => setBilletes({ ...billetes, [d]: Math.max(0, n) })} />
            </View>
          ))}
          <FilaCifra titulo={t('arqueo.contado')} valor={plata(contado)} fuerte />
        </View>
      )}
      {contó && (
        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="cifra" color={colorEstado}>
            {r.estado === 'cuadra' ? t('arqueo.cuadra') : t(`arqueo.${r.estado}`, { monto: plata(Math.abs(r.diferencia)) })}
          </Texto>
          {ajuste && (
            <Casilla
              titulo={t('arqueo.ajustar')}
              detalle={t(ajuste.tipo === 'venta' ? 'arqueo.ajustarSobra' : 'arqueo.ajustarFalta', { monto: plata(ajuste.monto) })}
              marcada={ajustar}
              onPress={() => setAjustar(!ajustar)}
            />
          )}
          <Boton titulo={t('arqueo.guardar')} cargando={guardando} onPress={guardar} />
        </View>
      )}
      {aviso && <Aviso mensaje={aviso.texto} tipo={aviso.tipo} />}
      {historial.length > 0 && (
        <ListaFilas titulo={t('arqueo.historial')}>
          {historial.map((a) => (
            <FilaCifra
              key={a.id}
              titulo={`${etiquetaDia(hoyEn(new Date(a.creado)), hoyEn(), textosFecha)} · ${nombre(a.cuenta)}`}
              ayuda={[t('arqueo.contoDe', { contado: plata(a.contado), esperado: plata(a.esperado) }), a.ajustado ? t('arqueo.ajustado') : null].filter(Boolean).join(' · ')}
              valor={a.diferencia === 0 ? t('arqueo.cuadraCorto') : conSigno(plata, a.diferencia)}
              color={a.diferencia === 0 ? colores.ingresoTexto : a.diferencia > 0 ? colores.avisoTexto : colores.errorTexto}
            />
          ))}
        </ListaFilas>
      )}
    </Tarjeta>
  );
}
