import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Casilla } from '@/components/Casilla';
import { Chip } from '@/components/Chip';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { hoyEn } from '@/lib/fechas';
import { estadisticasContacto, validarContacto } from '@/lib/contactos';
import { TIPOS_NEGOCIO } from '@/lib/negocio';
import { useNegocio } from '@/negocio/contexto';
import { borrarContacto, guardarContacto, type Contacto, type TipoDocumento } from '@/negocio/datos';
import { conSigno, FilaCifra, ListaFilas } from '@/negocio/Piezas';
import { etiquetaDia } from '@/personal/etiquetas';
import { usePlata, useTextosFecha } from '@/personal/ganchos';
import { ESPACIO } from '@/theme';

const DOCUMENTOS: TipoDocumento[] = ['cedula', 'nit', 'ce', 'pasaporte'];
const VACIO: Omit<Contacto, 'id'> = { tipo: 'cliente', nombre: '', tipoDocumento: null, documento: '', celular: '', correo: '', direccion: '', ciudad: '', notas: '' };

/** Ficha de un cliente o proveedor (spec 03, §6; regla B11): datos, autorización (Ley 1581) y estadísticas. */
export default function FichaContacto() {
  const { t } = useTranslation();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { negocio, contactos, movimientos, actualizar } = useNegocio();
  const existente = contactos.find((c) => c.id === id);
  const nuevo = !existente;
  const [d, setD] = useState<Omit<Contacto, 'id'>>(existente ? { ...existente } : VACIO);
  // Un contacto guardado ya tiene la autorización (la base de datos no deja guardarlo sin ella).
  const [autoriza, setAutoriza] = useState(!!existente);
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const cambiar = (c: Partial<Omit<Contacto, 'id'>>) => setD((x) => ({ ...x, ...c }));

  async function guardar() {
    setIntento(true);
    const codigo = validarContacto({ nombre: d.nombre, autoriza, correo: d.correo });
    if (codigo) return setError(t(`errores.${codigo}`));
    if (!negocio) return;
    setGuardando(true);
    const { error: e } = await guardarContacto(negocio.id, d, existente?.id);
    setGuardando(false);
    if (e) return setError(t('contactos.error'));
    actualizar();
    router.back();
  }

  function preguntarBorrar() {
    if (!existente) return;
    Alert.alert(t('contactos.borrar'), t('contactos.confirmarBorrar'), [
      { text: t('movimiento.cancelar'), style: 'cancel' },
      {
        text: t('contactos.siBorrar'),
        style: 'destructive',
        onPress: async () => {
          const { error: e } = await borrarContacto(existente.id);
          if (e) return setError(t('contactos.error'));
          actualizar();
          router.back();
        },
      },
    ]);
  }

  const stats = existente ? estadisticasContacto(existente.id, movimientos) : null;
  const suyos = existente ? movimientos.filter((m) => m.contacto === existente.id).slice(0, 20) : [];
  const hoy = hoyEn();

  return (
    <PantallaAjuste titulo={nuevo ? t('contactos.nuevo') : d.nombre || t('contactos.editar')}>
      {stats && (
        <Tarjeta>
          <Texto variante="medio">
            {stats.movimientos === 0
              ? t('contactos.sinMovimientos')
              : `${t(d.tipo === 'cliente' ? 'contactos.statsCliente' : 'contactos.statsProveedor', { total: plata(stats.total), n: stats.movimientos })} ${
                  stats.pendiente > 0
                    ? t(d.tipo === 'cliente' ? 'contactos.statsDebeCliente' : 'contactos.statsDebeProveedor', { monto: plata(stats.pendiente) })
                    : t('contactos.statsAlDia')
                }`}
          </Texto>
        </Tarjeta>
      )}

      <Texto variante="fuerte">{t('contactos.tipo')}</Texto>
      <View style={{ flexDirection: 'row', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        <Chip texto={t('contactos.cliente')} elegido={d.tipo === 'cliente'} onPress={() => cambiar({ tipo: 'cliente' })} />
        <Chip texto={t('contactos.proveedor')} elegido={d.tipo === 'proveedor'} onPress={() => cambiar({ tipo: 'proveedor' })} />
      </View>

      <CampoTexto
        etiqueta={`${t('contactos.nombre')} *`}
        placeholder={t('contactos.ejemploNombre')}
        value={d.nombre}
        onChangeText={(v) => cambiar({ nombre: v })}
        maxLength={120}
        error={intento && !d.nombre.trim() ? t('errores.contactoSinNombre') : null}
      />

      <Texto variante="fuerte">{t('contactos.tipoDocumento')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {DOCUMENTOS.map((doc) => (
          <Chip key={doc} texto={t(`contactos.documentos.${doc}`)} elegido={d.tipoDocumento === doc} onPress={() => cambiar({ tipoDocumento: d.tipoDocumento === doc ? null : doc })} />
        ))}
      </View>
      {d.tipoDocumento && <CampoTexto etiqueta="" accessibilityLabel={t('contactos.numero')} placeholder={t('contactos.numero')} value={d.documento} onChangeText={(v) => cambiar({ documento: v })} maxLength={30} />}

      <CampoTexto etiqueta={t('contactos.celular')} placeholder="300 123 4567" keyboardType="phone-pad" value={d.celular} onChangeText={(v) => cambiar({ celular: v })} maxLength={20} />
      <CampoTexto
        etiqueta={t('contactos.correo')}
        placeholder="nombre@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={d.correo}
        onChangeText={(v) => cambiar({ correo: v })}
        maxLength={120}
      />
      <CampoTexto etiqueta={t('contactos.direccion')} value={d.direccion} onChangeText={(v) => cambiar({ direccion: v })} maxLength={160} />
      <CampoTexto etiqueta={t('contactos.ciudad')} value={d.ciudad} onChangeText={(v) => cambiar({ ciudad: v })} maxLength={60} />
      <CampoTexto etiqueta={t('contactos.notas')} placeholder={t('contactos.ejemploNotas')} value={d.notas} onChangeText={(v) => cambiar({ notas: v })} maxLength={300} multiline />

      <Casilla titulo={t('contactos.autoriza')} detalle={t('contactos.autorizaDetalle')} marcada={autoriza} conError={intento && !autoriza} onPress={() => setAutoriza((v) => !v)} />

      {error && <Aviso mensaje={error} />}
      <Boton titulo={t('contactos.guardar')} onPress={guardar} cargando={guardando} />

      {suyos.length > 0 && (
        <ListaFilas titulo={t('contactos.historial')}>
          {suyos.map((m) => (
            <FilaCifra
              key={m.id}
              titulo={m.concepto || t(`negocioApp.tipos.${m.tipo}.nombre`)}
              ayuda={`${etiquetaDia(m.fecha, hoy, textosFecha)}${m.pagado ? '' : ` · ${m.tipo === 'venta' ? t('negocioApp.resumen.porCobrar') : t('negocioApp.resumen.porPagar')}`}`}
              valor={TIPOS_NEGOCIO[m.tipo].entra ? `+ ${plata(m.monto)}` : conSigno(plata, m.monto)}
            />
          ))}
        </ListaFilas>
      )}

      {existente && <Boton titulo={t('contactos.borrar')} variante="texto" onPress={preguntarBorrar} />}
    </PantallaAjuste>
  );
}
