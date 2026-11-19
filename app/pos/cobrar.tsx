import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { usePerfil } from '@/auth/perfil';
import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Interruptor } from '@/components/Interruptor';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, modoEjemploActivo } from '@/ejemplo/modo';
import { CampoCantidad } from '@/inventario/Piezas';
import { hoyEn } from '@/lib/fechas';
import { formasDePago, type FormaPago } from '@/lib/formasPago';
import { stockDeVariante } from '@/lib/inventario';
import { dividirPago, sugerenciasEfectivo, totalesVenta, validarCobro, vuelto, type IvaVenta } from '@/lib/pos';
import { useNegocio } from '@/negocio/contexto';
import { leerErrorInventario } from '@/negocio/inventarioDatos';
import { FilaCifra, ListaFilas } from '@/negocio/Piezas';
import { usePlata } from '@/personal/ganchos';
import { avisarVenta, sonidoActivo } from '@/pos/aviso';
import { usePos } from '@/pos/contexto';
import { borrarFormaPago, cobrarVenta, crearFormaPago, type PagoVenta } from '@/pos/datos';
import { HojaCliente } from '@/pos/HojaCliente';
import { PantallaPos } from '@/pos/PantallaPos';
import { ALTO_TOCABLE, ESPACIO, FUENTES, useTema } from '@/theme';

const DESCUENTOS = [5, 10, 15, 20];

/** Sirumi POS · Cobrar (spec 05, §2; reglas D1, D3, D5). */
export default function Cobrar() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const perfil = usePerfil();
  const { negocio, cuentas, contactos, stock, bodegas, formasPago, parametros, actualizar } = useNegocio();
  const pos = usePos();
  const vendedor = negocio?.rol === 'seller';
  const bodega = (vendedor ? negocio?.bodegaAsignada : null) ?? pos.bodega ?? bodegas.find((b) => b.principal)?.id ?? bodegas[0]?.id ?? null;
  const [hojaCliente, setHojaCliente] = useState(false);
  const [montoDescuento, setMontoDescuento] = useState(pos.descuento?.tipo === 'monto');
  const [otra, setOtra] = useState<{ nombre: string; cuenta: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [otroRecibido, setOtroRecibido] = useState(false);

  const formas = formasDePago(cuentas, formasPago);
  const nombreForma = (f: FormaPago) => (f.tipo === 'datafono' ? t('pos.datafono') : f.tipo === 'fiado' ? t('pos.fiado') : f.nombre);
  const forma = formas.find((f) => f.clave === pos.forma) ?? null;
  const fiado = forma?.tipo === 'fiado';
  const segunda = formas.find((f) => f.clave === pos.segundaForma) ?? null;
  // D6 · Solo si el negocio es responsable de IVA. Lo normal: el precio ya lo incluye.
  const iva: IvaVenta = negocio?.configuracion.responsable_iva ? { tarifa: parametros?.iva ?? 19, incluido: pos.ivaIncluido } : null;
  const { subtotal, descuento, base, iva: valorIva, total } = totalesVenta(pos.lineas, pos.descuento, iva);
  const [parte1, parte2] = pos.dividido ? dividirPago(total, pos.porcentaje) : [total, 0];
  const conEfectivo = forma?.tipo === 'efectivo' && !pos.dividido;
  const recibido = conEfectivo ? pos.recibido : null;
  const cliente = contactos.find((c) => c.id === pos.cliente) ?? null;
  const motivo = validarCobro({ lineas: pos.lineas, forma: forma && !fiado ? forma.clave : null, fiado, cliente: pos.cliente, dividido: pos.dividido, segundaForma: pos.segundaForma });
  const falta = recibido !== null && recibido < total;

  function elegirForma(f: FormaPago) {
    setOtra(null);
    pos.cambiar({ forma: f.clave, recibido: null, ...(f.tipo === 'fiado' ? { dividido: false, segundaForma: null } : {}), ...(pos.segundaForma === f.clave ? { segundaForma: null } : {}) });
  }

  function quitarForma(f: FormaPago) {
    if (f.tipo !== 'propia') return;
    Alert.alert(t('pos.quitar'), t('pos.quitarForma', { nombre: f.nombre }), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      {
        text: t('pos.quitar'),
        style: 'destructive',
        onPress: async () => {
          await borrarFormaPago(f.clave.replace('propia-', ''));
          if (pos.forma === f.clave) pos.cambiar({ forma: 'efectivo' });
          actualizar();
        },
      },
    ]);
  }

  async function guardarOtra() {
    if (!negocio || !otra?.nombre.trim() || !otra.cuenta) return;
    const { data, error: e } = await crearFormaPago(negocio.id, otra.nombre, otra.cuenta);
    if (e || !data) return setError(t('pos.errores.general'));
    setOtra(null);
    pos.cambiar({ forma: `propia-${(data as { id: string }).id}` });
    actualizar();
  }

  async function cobrar() {
    if (motivo || !negocio || !forma || falta) return;
    if (modoEjemploActivo()) return avisarEjemplo();
    const pagos: PagoVenta[] = fiado
      ? [{ nombre: t('pos.fiado'), cuenta: null, monto: total }]
      : pos.dividido && segunda
        ? [
            { nombre: nombreForma(forma), cuenta: forma.cuenta, monto: parte1 },
            { nombre: nombreForma(segunda), cuenta: segunda.cuenta, monto: parte2 },
          ]
        : [{ nombre: nombreForma(forma), cuenta: forma.cuenta, monto: total }];
    setError(null);
    setCobrando(true);
    const { data, error: e } = await cobrarVenta(negocio.id, {
      fecha: hoyEn(),
      bodega,
      cliente: pos.cliente,
      descuento,
      recibido,
      iva,
      lineas: pos.lineas.map((l) => ({ variante: l.variante, nombre: l.nombre, precio: l.precio, cantidad: l.cantidad })),
      pagos,
    });
    setCobrando(false);
    const err = leerErrorInventario(e);
    if (err || !data) {
      return setError(err?.codigo === 'stockInsuficiente' ? t('pos.errores.stockInsuficiente', err.detalle) : t('pos.errores.general'));
    }
    const venta = data as { id: string; number: number };
    avisarVenta(sonidoActivo(perfil?.preferences));
    pos.cambiar({
      comprobante: {
        numero: venta.number,
        subtotal,
        descuento,
        total,
        pagos,
        vuelto: recibido !== null ? vuelto(recibido, total) : null,
        iva: valorIva,
        tarifaIva: iva?.tarifa ?? null,
        ivaIncluido: iva ? iva.incluido : null,
        lineas: pos.lineas.map((l) => ({ nombre: l.nombre, precio: l.precio, cantidad: l.cantidad })),
        cliente: cliente?.nombre ?? null,
        celularCliente: cliente?.celular || null,
      },
    });
    actualizar();
    router.replace('/pos/listo');
  }

  const disponible = (variante: string | null) => (variante && bodega ? stockDeVariante(variante, stock, bodega) : Infinity);

  return (
    <PantallaPos
      titulo={t('pos.cobrar')}
      pie={
        <View style={{ gap: ESPACIO.xs }}>
          {motivo && pos.lineas.length > 0 ? (
            <Texto variante="pequeno" color={colores.avisoTexto} style={{ textAlign: 'center' }}>
              {t(`pos.motivos.${motivo}`)}
            </Texto>
          ) : null}
          <Boton titulo={t('pos.cobrarMonto', { monto: plata(total) })} onPress={cobrar} cargando={cobrando} disabled={!!motivo || falta} />
        </View>
      }>
      {/* Carrito */}
      <ListaFilas titulo={t('pos.carrito')}>
        {pos.lineas.map((l) => (
          <View key={l.clave} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s, minHeight: 64, paddingVertical: ESPACIO.xs }}>
            <View style={{ flex: 1 }}>
              <Texto variante="fuerte" numberOfLines={2}>
                {l.nombre}
              </Texto>
              <Texto variante="pequeno">{plata(l.precio * l.cantidad)}</Texto>
            </View>
            <CampoCantidad etiqueta={l.nombre} soloBotones valor={l.cantidad} onCambio={(c) => pos.cambiarCantidad(l.clave, Math.min(c, disponible(l.variante)))} />
          </View>
        ))}
      </ListaFilas>
      <Boton titulo={t('pos.seguirVendiendo')} variante="texto" onPress={() => router.back()} />

      {/* Descuento (D1) */}
      <Texto variante="fuerte">{t('pos.descuento')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        <Chip
          texto={t('pos.sinDescuento')}
          elegido={!pos.descuento && !montoDescuento}
          onPress={() => {
            setMontoDescuento(false);
            pos.cambiar({ descuento: null });
          }}
        />
        {DESCUENTOS.map((d) => (
          <Chip
            key={d}
            texto={`${d}%`}
            elegido={pos.descuento?.tipo === 'porcentaje' && pos.descuento.valor === d}
            onPress={() => {
              setMontoDescuento(false);
              pos.cambiar({ descuento: { tipo: 'porcentaje', valor: d } });
            }}
          />
        ))}
        <Chip
          texto={t('pos.monto')}
          elegido={montoDescuento}
          onPress={() => {
            setMontoDescuento(true);
            pos.cambiar({ descuento: { tipo: 'monto', valor: 0 } });
          }}
        />
      </View>
      {montoDescuento && <CampoDinero etiqueta={t('pos.montoDescuento')} valor={pos.descuento?.valor ?? 0} onCambio={(v) => pos.cambiar({ descuento: { tipo: 'monto', valor: v } })} />}

      {/* IVA (D6): solo para responsables de IVA */}
      {iva && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, minHeight: ALTO_TOCABLE }}>
          <View style={{ flex: 1 }}>
            <Texto variante="fuerte">{t('pos.iva.incluido', { tarifa: iva.tarifa })}</Texto>
            <Texto variante="pequeno">{pos.ivaIncluido ? t('pos.iva.incluidoAyuda') : t('pos.iva.sumarAyuda')}</Texto>
          </View>
          <Interruptor etiqueta={t('pos.iva.incluido', { tarifa: iva.tarifa })} encendido={pos.ivaIncluido} onCambio={(v) => pos.cambiar({ ivaIncluido: v, recibido: null })} />
        </View>
      )}

      {/* Cliente (D5) */}
      <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, padding: ESPACIO.m }}>
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta">{t('pos.cliente')}</Texto>
          <Texto variante="fuerte">{cliente?.nombre ?? t('pos.consumidorFinal')}</Texto>
        </View>
        <Boton titulo={t('pos.cambiarCliente')} variante="texto" onPress={() => setHojaCliente(true)} />
      </Tarjeta>

      {/* Cómo paga (D3) */}
      <Texto variante="fuerte">{t('pos.comoPaga')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {formas.map((f) => (
          <Pressable
            key={f.clave}
            accessibilityRole="radio"
            accessibilityState={{ selected: pos.forma === f.clave }}
            onPress={() => elegirForma(f)}
            onLongPress={() => !vendedor && quitarForma(f)}
            style={({ pressed }) => ({
              minHeight: ALTO_TOCABLE,
              paddingHorizontal: ESPACIO.m,
              justifyContent: 'center',
              borderRadius: 999,
              backgroundColor: pos.forma === f.clave ? colores.accion : colores.relleno,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}>
            <Texto style={{ fontFamily: FUENTES.textoFuerte, fontSize: 14 }} color={pos.forma === f.clave ? colores.textoSobreAccion : colores.texto}>
              {nombreForma(f)}
            </Texto>
          </Pressable>
        ))}
        {!vendedor && <Chip texto={t('pos.otro')} elegido={!!otra} onPress={() => setOtra({ nombre: '', cuenta: cuentas.find((c) => c.principal)?.id ?? null })} />}
      </View>
      {otra && (
        <Tarjeta style={{ gap: ESPACIO.s }}>
          <CampoTexto etiqueta="" accessibilityLabel={t('pos.nombreForma')} placeholder={t('pos.nombreForma')} value={otra.nombre} onChangeText={(v) => setOtra({ ...otra, nombre: v })} maxLength={40} />
          <Texto variante="fuerte">{t('pos.llegaA')}</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
            {cuentas.map((c) => (
              <Chip key={c.id} texto={c.nombre} elegido={otra.cuenta === c.id} onPress={() => setOtra({ ...otra, cuenta: c.id })} />
            ))}
          </View>
          <Boton titulo={t('pos.guardarYUsar')} disabled={!otra.nombre.trim() || !otra.cuenta} onPress={guardarOtra} />
        </Tarjeta>
      )}
      {fiado && !cliente && <Aviso mensaje={t('pos.motivos.fiadoSinCliente')} tipo="info" />}

      {/* Pago dividido (D3) */}
      {!fiado && forma && (
        <View style={{ gap: ESPACIO.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.m, minHeight: ALTO_TOCABLE }}>
            <Texto variante="fuerte" style={{ flex: 1 }}>
              {t('pos.dividir')}
            </Texto>
            <Interruptor etiqueta={t('pos.dividir')} encendido={pos.dividido} onCambio={(v) => pos.cambiar({ dividido: v, recibido: null })} />
          </View>
          {pos.dividido && (
            <Tarjeta style={{ gap: ESPACIO.s }}>
              <View style={{ flexDirection: 'row', gap: ESPACIO.s }}>
                {[25, 50, 75].map((p) => (
                  <Chip key={p} texto={`${p}%`} elegido={pos.porcentaje === p} onPress={() => pos.cambiar({ porcentaje: p })} />
                ))}
              </View>
              <Texto variante="etiqueta">{t('pos.segundaForma')}</Texto>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
                {formas
                  .filter((f) => f.tipo !== 'fiado' && f.clave !== forma.clave)
                  .map((f) => (
                    <Chip key={f.clave} texto={nombreForma(f)} elegido={pos.segundaForma === f.clave} onPress={() => pos.cambiar({ segundaForma: f.clave })} />
                  ))}
              </View>
              <Texto variante="medio">{t('pos.parte', { forma: nombreForma(forma), monto: plata(parte1) })}</Texto>
              {segunda && <Texto variante="medio">{t('pos.parte', { forma: nombreForma(segunda), monto: plata(parte2) })}</Texto>}
            </Tarjeta>
          )}
        </View>
      )}

      {/* Efectivo: con cuánto paga y vuelto (D3) */}
      {conEfectivo && total > 0 && (
        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="fuerte">{t('pos.conCuanto')}</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }}>
            {sugerenciasEfectivo(total).map((v, i) => (
              <Chip
                key={v}
                texto={i === 0 ? t('pos.exacto') : plata(v)}
                elegido={!otroRecibido && pos.recibido === v}
                onPress={() => {
                  setOtroRecibido(false);
                  pos.cambiar({ recibido: v });
                }}
              />
            ))}
            <Chip texto={t('pos.otroMonto')} elegido={otroRecibido} onPress={() => setOtroRecibido(true)} />
          </View>
          {otroRecibido && <CampoDinero etiqueta="" accessibilityLabel={t('pos.otroMonto')} valor={pos.recibido ?? 0} onCambio={(v) => pos.cambiar({ recibido: v || null })} />}
          {pos.recibido !== null && (
            <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 20, lineHeight: 26 }} color={falta ? colores.errorTexto : colores.ingresoTexto}>
              {falta ? t('pos.falta', { monto: plata(total - pos.recibido) }) : t('pos.vuelto', { monto: plata(vuelto(pos.recibido, total)) })}
            </Texto>
          )}
        </View>
      )}

      {/* Totales */}
      <ListaFilas>
        {[
          <FilaCifra key="s" titulo={t('pos.subtotal')} valor={plata(subtotal)} />,
          descuento > 0 ? <FilaCifra key="d" titulo={t('pos.descuento')} valor={`−${plata(descuento)}`} color={colores.ingresoTexto} /> : null,
          iva ? <FilaCifra key="b" titulo={t('pos.iva.base')} valor={plata(base)} /> : null,
          iva ? <FilaCifra key="i" titulo={t('pos.iva.linea', { tarifa: iva.tarifa })} valor={plata(valorIva)} /> : null,
          <FilaCifra key="t" titulo={t('pos.total')} valor={plata(total)} fuerte />,
        ]}
      </ListaFilas>

      {error && <Aviso mensaje={error} />}

      {negocio && (
        <HojaCliente
          abierta={hojaCliente}
          negocioId={negocio.id}
          clientes={contactos.filter((c) => c.tipo === 'cliente')}
          elegido={pos.cliente}
          onCreado={actualizar}
          onElegir={(id) => {
            pos.cambiar({ cliente: id });
            setHojaCliente(false);
          }}
          onCerrar={() => setHojaCliente(false)}
        />
      )}
    </PantallaPos>
  );
}
