import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Emoji, type NombreEmoji } from '@/components/emoji/Emoji';
import { Icono } from '@/components/Icono';
import { Interruptor } from '@/components/Interruptor';
import { GrupoAjustes, PantallaAjuste } from '@/components/PantallaAjuste';
import { Texto } from '@/components/Texto';
import { validarNombreCategoria } from '@/lib/exportar';
import { usePersonal } from '@/personal/contexto';
import { guardarCategoria, type Categoria } from '@/personal/datos';
import { useNombreCategoria } from '@/personal/ganchos';
import { ALTO_TOCABLE, COLORES_CATEGORIA, ESPACIO, FUENTES, useTema, type ColorCategoria } from '@/theme';

/** Íconos para categorías nuevas (emojis 3D de assets/emojis). */
const EMOJIS: NombreEmoji[] = [
  'bolsas-de-compras', 'hamburguesa', 'cafe', 'taxi', 'carro', 'moto', 'aguacate', 'carrito-de-compras', 'bola-disco', 'perro',
  'casa', 'celular', 'portatil', 'estetoscopio', 'birrete', 'libros', 'regalo', 'camiseta', 'avion', 'isla', 'trofeo',
  'herramientas', 'paleta', 'bolsa-de-dinero', 'billete', 'tarjeta', 'alcancia', 'diamante', 'salvavidas', 'cerebro',
];
const COLORES = Object.keys(COLORES_CATEGORIA) as ColorCategoria[];

/** Ajustes · Categorías: crear, renombrar y ocultar (docs/specs/02-personal.md). */
export default function Categorias() {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const nombreCategoria = useNombreCategoria();
  const { categorias, recargarCategorias } = usePersonal();
  const [editando, setEditando] = useState<{ categoria: Categoria | null } | null>(null);

  const tinte = (color: string) => {
    const c = COLORES_CATEGORIA[(color as ColorCategoria) in COLORES_CATEGORIA ? (color as ColorCategoria) : 'gris'];
    return oscuro ? c.oscuro : c.claro;
  };

  const fila = (c: Categoria) => (
    <Pressable
      key={c.id}
      accessibilityRole="button"
      onPress={() => setEditando({ categoria: c })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s + 4, minHeight: ALTO_TOCABLE + 20, opacity: pressed ? 0.7 : c.hidden ? 0.55 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: tinte(c.color) }}>
        <Emoji name={c.emoji as NombreEmoji} size={26} />
      </View>
      <Texto style={{ flex: 1, fontFamily: FUENTES.titulo, fontSize: 16, lineHeight: 21 }}>{nombreCategoria(c)}</Texto>
      {c.hidden && (
        <View style={{ paddingHorizontal: ESPACIO.s + 2, paddingVertical: 3, borderRadius: 999, backgroundColor: colores.relleno }}>
          <Texto variante="pequeno">{t('categoriasAjustes.oculta')}</Texto>
        </View>
      )}
      <Icono nombre="adelante" tamano={18} color={colores.textoSuave} />
    </Pressable>
  );

  return (
    <PantallaAjuste titulo={t('categoriasAjustes.titulo')} detalle={t('categoriasAjustes.detalle')}>
      <GrupoAjustes titulo={t('categoriasAjustes.gastos')}>{categorias.filter((c) => c.kind === 'gasto').map(fila)}</GrupoAjustes>
      <GrupoAjustes titulo={t('categoriasAjustes.ingresos')}>{categorias.filter((c) => c.kind === 'ingreso').map(fila)}</GrupoAjustes>
      <Boton titulo={`+ ${t('categoriasAjustes.agregar')}`} variante="secundario" onPress={() => setEditando({ categoria: null })} />

      <Modal visible={!!editando} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditando(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={['top', 'bottom']}>
          {editando && (
            <FormularioCategoria
              key={editando.categoria?.id ?? 'nueva'}
              categoria={editando.categoria}
              existentes={categorias.filter((c) => c.id !== editando.categoria?.id).map((c) => nombreCategoria(c))}
              onCerrar={() => setEditando(null)}
              onGuardado={() => {
                setEditando(null);
                recargarCategorias();
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </PantallaAjuste>
  );
}

function FormularioCategoria({
  categoria,
  existentes,
  onCerrar,
  onGuardado,
}: {
  categoria: Categoria | null;
  existentes: string[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { t } = useTranslation();
  const { colores, oscuro } = useTema();
  const nombreCategoria = useNombreCategoria();
  const [nombre, setNombre] = useState(categoria ? nombreCategoria(categoria) : '');
  const [emoji, setEmoji] = useState<string>(categoria?.emoji ?? EMOJIS[0]);
  const [color, setColor] = useState<string>(categoria?.color ?? 'azul');
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>((categoria?.kind as 'gasto' | 'ingreso') ?? 'gasto');
  const [oculta, setOculta] = useState(categoria?.hidden ?? false);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState(false);
  const errorNombre = validarNombreCategoria(nombre, existentes);
  const tinte = (c: string) => (oscuro ? COLORES_CATEGORIA[c as ColorCategoria].oscuro : COLORES_CATEGORIA[c as ColorCategoria].claro);

  async function guardar() {
    setIntentado(true);
    if (errorNombre) return;
    setGuardando(true);
    // Si es una categoría inicial y no le cambiaron el nombre, se deja sin nombre propio para que siga el idioma de la app.
    const nombreFinal = categoria?.key && nombre.trim() === nombreCategoria({ ...categoria, name: null }) ? '' : nombre;
    const { error } = await guardarCategoria({ nombre: nombreFinal, emoji, color, tipo, oculta }, categoria ?? undefined);
    setGuardando(false);
    if (error) return setErrorServidor(true);
    onGuardado();
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
        <Texto variante="titulo" style={{ flex: 1 }}>
          {categoria ? t('categoriasAjustes.editar') : t('categoriasAjustes.nueva')}
        </Texto>
        <View style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tinte(color) }}>
          <Emoji name={emoji as NombreEmoji} size={34} />
        </View>
      </View>

      <CampoTexto
        etiqueta={t('categoriasAjustes.nombre')}
        value={nombre}
        onChangeText={setNombre}
        autoCapitalize="sentences"
        maxLength={30}
        error={intentado && errorNombre ? t(`errores.${errorNombre}`) : null}
      />

      {!categoria && (
        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="fuerte">{t('categoriasAjustes.tipo')}</Texto>
          <View style={{ flexDirection: 'row', gap: ESPACIO.s }}>
            <Chip texto={t('movimiento.gasto')} elegido={tipo === 'gasto'} onPress={() => setTipo('gasto')} />
            <Chip texto={t('movimiento.ingreso')} elegido={tipo === 'ingreso'} onPress={() => setTipo('ingreso')} />
          </View>
        </View>
      )}

      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="fuerte">{t('categoriasAjustes.emoji')}</Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="radio"
              accessibilityLabel={e}
              accessibilityState={{ selected: emoji === e }}
              onPress={() => setEmoji(e)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: emoji === e ? colores.accion : 'transparent',
                backgroundColor: colores.tarjeta,
              }}>
              <Emoji name={e} size={28} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="fuerte">{t('categoriasAjustes.color')}</Texto>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
          {COLORES.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityLabel={c}
              accessibilityState={{ selected: color === c }}
              onPress={() => setColor(c)}
              style={{ width: ALTO_TOCABLE, height: ALTO_TOCABLE, borderRadius: ALTO_TOCABLE / 2, borderWidth: 3, borderColor: color === c ? colores.accion : 'transparent', backgroundColor: tinte(c) }}
            />
          ))}
        </View>
      </View>

      {categoria && (
        <View style={{ gap: ESPACIO.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
            <Texto variante="fuerte" style={{ flex: 1 }}>
              {t('categoriasAjustes.ocultar')}
            </Texto>
            <Interruptor etiqueta={t('categoriasAjustes.ocultar')} encendido={oculta} onCambio={setOculta} />
          </View>
          <Texto variante="pequeno">{t('categoriasAjustes.ocultarAyuda')}</Texto>
        </View>
      )}

      {errorServidor && <Aviso mensaje={t('categoriasAjustes.error')} />}
      <Boton titulo={t('categoriasAjustes.guardar')} onPress={guardar} cargando={guardando} />
    </ScrollView>
  );
}
