import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Casilla } from '@/components/Casilla';
import { Chip } from '@/components/Chip';
import { Icono } from '@/components/Icono';
import { Texto } from '@/components/Texto';
import { validarContacto } from '@/lib/contactos';
import { guardarContacto, type Contacto, type TipoDocumento } from '@/negocio/datos';
import { ALTO_TOCABLE, ESPACIO, useTema } from '@/theme';

const DOCUMENTOS: TipoDocumento[] = ['cedula', 'nit', 'ce', 'pasaporte'];
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Props = {
  abierta: boolean;
  negocioId: string;
  clientes: Contacto[];
  elegido: string | null;
  onElegir: (id: string | null) => void;
  /** Después de registrar uno nuevo (para volver a leer los contactos). */
  onCreado: () => void;
  onCerrar: () => void;
};

/** Cliente de la venta (D5): consumidor final, buscar uno o registrarlo con su autorización (Ley 1581). */
export function HojaCliente(props: Props) {
  const { colores } = useTema();
  return (
    <Modal visible={props.abierta} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
        {props.abierta && <Contenido {...props} />}
      </SafeAreaView>
    </Modal>
  );
}

function Contenido({ negocioId, clientes, elegido, onElegir, onCreado, onCerrar }: Props) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const [busqueda, setBusqueda] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento | null>(null);
  const [documento, setDocumento] = useState('');
  const [notas, setNotas] = useState('');
  const [autoriza, setAutoriza] = useState(false);
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const texto = sinTildes(busqueda.trim());
  const lista = clientes.filter((c) => !texto || [c.nombre, c.celular, c.documento].some((v) => sinTildes(v).includes(texto)));

  async function guardar() {
    setIntento(true);
    const codigo = validarContacto({ nombre, autoriza, correo });
    if (codigo) return setError(t(`errores.${codigo}`));
    setGuardando(true);
    const { data, error: e } = await guardarContacto(negocioId, {
      tipo: 'cliente',
      nombre,
      tipoDocumento: tipoDoc,
      documento,
      celular,
      correo,
      direccion: '',
      ciudad: '',
      notas,
    });
    setGuardando(false);
    if (e || !data) return setError(t('contactos.error'));
    onCreado();
    onElegir((data as { id: string }).id);
  }

  const cabecera = (titulo: string, volver?: () => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={volver ? t('comun.atras') : t('comun.cerrar')}
        onPress={volver ?? onCerrar}
        style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.relleno }}>
        <Icono nombre={volver ? 'atras' : 'cerrar'} tamano={18} />
      </Pressable>
      <Texto variante="subtitulo" style={{ flex: 1 }}>
        {titulo}
      </Texto>
    </View>
  );

  if (nuevo) {
    return (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.m }}>
        {cabecera(t('pos.clienteNuevo'), () => setNuevo(false))}
        <CampoTexto
          etiqueta={`${t('contactos.nombre')} *`}
          placeholder={t('contactos.ejemploNombre')}
          value={nombre}
          onChangeText={setNombre}
          maxLength={120}
          error={intento && !nombre.trim() ? t('errores.contactoSinNombre') : null}
        />
        <CampoTexto etiqueta={t('contactos.celular')} placeholder="300 123 4567" keyboardType="phone-pad" value={celular} onChangeText={setCelular} maxLength={20} />
        <CampoTexto etiqueta={t('contactos.correo')} placeholder="nombre@correo.com" keyboardType="email-address" autoCapitalize="none" value={correo} onChangeText={setCorreo} maxLength={120} />
        <Texto variante="fuerte">{t('contactos.tipoDocumento')}</Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
          {DOCUMENTOS.map((d) => (
            <Chip key={d} texto={t(`contactos.documentos.${d}`)} elegido={tipoDoc === d} onPress={() => setTipoDoc(tipoDoc === d ? null : d)} />
          ))}
        </View>
        {tipoDoc && <CampoTexto etiqueta="" accessibilityLabel={t('contactos.numero')} placeholder={t('contactos.numero')} value={documento} onChangeText={setDocumento} maxLength={30} />}
        <CampoTexto etiqueta={t('contactos.notas')} placeholder={t('contactos.ejemploNotas')} value={notas} onChangeText={setNotas} maxLength={300} />
        <Casilla titulo={t('contactos.autoriza')} detalle={t('contactos.autorizaDetalle')} marcada={autoriza} conError={intento && !autoriza} onPress={() => setAutoriza((v) => !v)} />
        {error && <Aviso mensaje={error} />}
        <Boton titulo={t('pos.guardarYUsar')} onPress={guardar} cargando={guardando} />
      </ScrollView>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: ESPACIO.m, gap: ESPACIO.s + 4 }}>
      {cabecera(t('pos.cliente'))}
      <CampoTexto etiqueta="" accessibilityLabel={t('pos.buscarCliente')} placeholder={t('pos.buscarCliente')} value={busqueda} onChangeText={setBusqueda} />
      <Boton titulo={t('pos.registrarCliente')} variante="secundario" onPress={() => setNuevo(true)} />
      <Opcion texto={t('pos.consumidorFinal')} elegido={elegido === null} onPress={() => onElegir(null)} />
      {lista.map((c) => (
        <Opcion key={c.id} texto={c.nombre} detalle={c.celular || c.documento} elegido={elegido === c.id} onPress={() => onElegir(c.id)} />
      ))}
      {texto && lista.length === 0 && <Texto variante="suave">{t('pos.noEsta')}</Texto>}
    </ScrollView>
  );
}

function Opcion({ texto, detalle, elegido, onPress }: { texto: string; detalle?: string; elegido: boolean; onPress: () => void }) {
  const { colores } = useTema();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: elegido }}
      onPress={onPress}
      style={{ minHeight: ALTO_TOCABLE + 12, justifyContent: 'center', paddingHorizontal: ESPACIO.m, borderRadius: 16, borderWidth: 2, borderColor: elegido ? colores.accion : 'transparent', backgroundColor: elegido ? colores.seleccionado : colores.tarjeta }}>
      <Texto variante="fuerte">{texto}</Texto>
      {detalle ? <Texto variante="pequeno">{detalle}</Texto> : null}
    </Pressable>
  );
}
