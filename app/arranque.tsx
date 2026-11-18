import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { usePerfil } from '@/auth/perfil';
import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { CampoDinero } from '@/components/CampoDinero';
import { CampoTexto } from '@/components/CampoTexto';
import { Chip } from '@/components/Chip';
import { Emoji } from '@/components/emoji/Emoji';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { valorInventario } from '@/lib/inventario';
import { iconoDeCuenta, resumenArranque } from '@/lib/negocio';
import { useNegocio } from '@/negocio/contexto';
import { guardarArranque, type Configuracion, type Regimen } from '@/negocio/datos';
import { paraReglas } from '@/negocio/inventarioDatos';
import { paisPorCodigo } from '@/onboarding/paises';
import { usePlata } from '@/personal/ganchos';
import { ESPACIO, FUENTES, useTema } from '@/theme';

type CuentaForm = { clave: string; id?: string; nombre: string; saldo: number; efectivo: boolean };
type TarjetaForm = { clave: string; id?: string; nombre: string; cupo: number; deuda: number };

const REGIMENES: Regimen[] = ['simple', 'ordinario', 'natural'];
const GRUPOS = [1, 2, 3, 4] as const;
let contador = 0;
const nuevaClave = () => `n${contador++}`;

/** Arranque del negocio (docs/specs/03-negocio.md, §1). Todo es opcional. */
export default function Arranque() {
  const { t } = useTranslation();
  const { negocio, cuentas, tarjetas, actualizar } = useNegocio();
  if (!negocio) return null;
  return (
    <FormularioArranque
      key={negocio.id}
      negocio={negocio}
      cuentasIniciales={cuentas.map((c) => ({ clave: c.id, id: c.id, nombre: c.nombre, saldo: c.saldoInicial, efectivo: c.tipo === 'efectivo' }))}
      tarjetasIniciales={tarjetas.map((tj) => ({ clave: tj.id, id: tj.id, nombre: tj.nombre, cupo: tj.cupo, deuda: tj.deudaInicial }))}
      alGuardar={actualizar}
      titulo={t('negocioApp.arranque.titulo')}
    />
  );
}

function FormularioArranque({
  negocio,
  cuentasIniciales,
  tarjetasIniciales,
  alGuardar,
  titulo,
}: {
  negocio: NonNullable<ReturnType<typeof useNegocio>['negocio']>;
  cuentasIniciales: CuentaForm[];
  tarjetasIniciales: TarjetaForm[];
  alGuardar: () => void;
  titulo: string;
}) {
  const { t } = useTranslation();
  const { colores } = useTema();
  const plata = usePlata();
  const perfil = usePerfil();
  const separador = paisPorCodigo(perfil?.country ?? 'CO').separador;

  const [nombre, setNombre] = useState(negocio.nombre);
  const [cuentasF, setCuentas] = useState<CuentaForm[]>(cuentasIniciales);
  const [tarjetasF, setTarjetas] = useState<TarjetaForm[]>(tarjetasIniciales);
  const [conf, setConf] = useState<Configuracion>(negocio.configuracion);
  const [regimen, setRegimen] = useState<Regimen | null>(negocio.regimen);
  const [costoTexto, setCostoTexto] = useState(negocio.configuracion.costo_porcentaje ? String(negocio.configuracion.costo_porcentaje) : '');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'info' | 'error' } | null>(null);

  const { productos, stock } = useNegocio();
  const inventario = valorInventario(paraReglas(productos), stock).aCosto;
  const resumen = resumenArranque({
    cuentas: cuentasF.map((c) => c.saldo),
    porCobrar: conf.por_cobrar_inicial ?? 0,
    inventario,
    equipos: conf.equipos ?? 0,
    deudaProveedores: conf.deuda_proveedores ?? 0,
    prestamos: conf.prestamos ?? 0,
    tarjetas: tarjetasF.map((tj) => ({ cupo: tj.cupo, deuda: tj.deuda })),
  });
  const cambiarConf = (parcial: Partial<Configuracion>) => setConf((c) => ({ ...c, ...parcial }));

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    const r = await guardarArranque(negocio, {
      nombre,
      regimen,
      configuracion: conf,
      cuentas: cuentasF.filter((c) => c.efectivo || c.nombre.trim()).map((c) => ({ id: c.id, nombre: c.nombre, saldo: c.saldo })),
      cuentasQuitadas: cuentasIniciales.filter((c) => !c.efectivo && !cuentasF.some((x) => x.id === c.id)).map((c) => c.id!),
      tarjetas: tarjetasF.filter((tj) => tj.nombre.trim()).map((tj) => ({ id: tj.id, nombre: tj.nombre, cupo: tj.cupo, deuda: tj.deuda })),
      tarjetasQuitadas: tarjetasIniciales.filter((tj) => !tarjetasF.some((x) => x.id === tj.id)).map((tj) => tj.id!),
    });
    setGuardando(false);
    alGuardar();
    if (r.error) return setMensaje({ texto: r.errorTarjeta ? t('negocioApp.arranque.errorTarjeta') : t('negocioApp.arranque.error'), tipo: 'error' });
    if (r.movidos > 0) return setMensaje({ texto: t('negocioApp.arranque.movidos', { cantidad: r.movidos }), tipo: 'info' });
    router.back();
  }

  const quitar = (onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Texto style={{ fontFamily: FUENTES.textoFuerte }} color={colores.errorTexto}>
        {t('negocioApp.arranque.quitar')}
      </Texto>
    </Pressable>
  );

  return (
    <PantallaAjuste titulo={titulo} detalle={t('negocioApp.arranque.detalle')}>
      <CampoTexto etiqueta={t('negocioApp.arranque.nombre')} value={nombre} onChangeText={setNombre} autoCapitalize="sentences" />

      {/* Lo que tienes */}
      <Texto variante="subtitulo">{t('negocioApp.arranque.tienes')}</Texto>
      <Texto variante="suave">{t('negocioApp.arranque.cuentasDetalle')}</Texto>
      {cuentasF.map((c, i) => {
        const icono = iconoDeCuenta(c.nombre) === 'billetera' ? 'celular' : c.efectivo ? 'billete' : 'banco';
        return (
          <Tarjeta key={c.clave} style={{ gap: ESPACIO.s }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
              <Emoji name={icono} size={28} />
              {c.efectivo ? (
                <Texto variante="fuerte" style={{ flex: 1 }}>
                  {c.nombre}
                </Texto>
              ) : (
                <View style={{ flex: 1 }}>
                  <CampoTexto
                    etiqueta=""
                    accessibilityLabel={t('negocioApp.arranque.nombreCuenta')}
                    placeholder={t('negocioApp.arranque.nombreCuenta')}
                    value={c.nombre}
                    onChangeText={(v) => setCuentas((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                  />
                </View>
              )}
            </View>
            <CampoDinero etiqueta={t('negocioApp.arranque.saldoHoy')} valor={c.saldo} separador={separador} onCambio={(v) => setCuentas((l) => l.map((x, j) => (j === i ? { ...x, saldo: v } : x)))} />
            {!c.efectivo && quitar(() => setCuentas((l) => l.filter((_, j) => j !== i)))}
          </Tarjeta>
        );
      })}
      <Boton titulo={t('negocioApp.arranque.agregarCuenta')} variante="secundario" onPress={() => setCuentas((l) => [...l, { clave: nuevaClave(), nombre: '', saldo: 0, efectivo: false }])} />
      <CampoDinero etiqueta={t('negocioApp.arranque.porCobrar')} valor={conf.por_cobrar_inicial ?? 0} separador={separador} onCambio={(v) => cambiarConf({ por_cobrar_inicial: v })} />
      <CampoDinero etiqueta={t('negocioApp.arranque.equipos')} valor={conf.equipos ?? 0} separador={separador} onCambio={(v) => cambiarConf({ equipos: v })} />
      <Texto variante="pequeno">{t('negocioApp.arranque.inventario', { monto: plata(inventario) })}</Texto>

      {/* Lo que debes */}
      <Texto variante="subtitulo">{t('negocioApp.arranque.debes')}</Texto>
      <CampoDinero etiqueta={t('negocioApp.arranque.proveedores')} valor={conf.deuda_proveedores ?? 0} separador={separador} onCambio={(v) => cambiarConf({ deuda_proveedores: v })} />
      <CampoDinero etiqueta={t('negocioApp.arranque.prestamos')} valor={conf.prestamos ?? 0} separador={separador} onCambio={(v) => cambiarConf({ prestamos: v })} />
      <Texto variante="fuerte">{t('negocioApp.arranque.tarjetas')}</Texto>
      {tarjetasF.map((tj, i) => (
        <Tarjeta key={tj.clave} style={{ gap: ESPACIO.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.s }}>
            <Emoji name="tarjeta" size={28} />
            <View style={{ flex: 1 }}>
              <CampoTexto
                etiqueta=""
                accessibilityLabel={t('negocioApp.arranque.nombreTarjeta')}
                placeholder={t('negocioApp.arranque.nombreTarjeta')}
                value={tj.nombre}
                onChangeText={(v) => setTarjetas((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
              />
            </View>
          </View>
          <CampoDinero etiqueta={t('negocioApp.arranque.cupo')} valor={tj.cupo} separador={separador} onCambio={(v) => setTarjetas((l) => l.map((x, j) => (j === i ? { ...x, cupo: v } : x)))} />
          <CampoDinero etiqueta={t('negocioApp.arranque.deudaHoy')} valor={tj.deuda} separador={separador} onCambio={(v) => setTarjetas((l) => l.map((x, j) => (j === i ? { ...x, deuda: v } : x)))} />
          {tj.deuda > tj.cupo ? (
            <Texto variante="pequeno" color={colores.errorTexto}>
              {t('negocioApp.arranque.excedida')}
            </Texto>
          ) : (
            <Texto variante="pequeno">{t('negocioApp.arranque.disponible', { monto: plata(tj.cupo - tj.deuda) })}</Texto>
          )}
          {quitar(() => setTarjetas((l) => l.filter((_, j) => j !== i)))}
        </Tarjeta>
      ))}
      <Boton titulo={t('negocioApp.arranque.agregarTarjeta')} variante="secundario" onPress={() => setTarjetas((l) => [...l, { clave: nuevaClave(), nombre: '', cupo: 0, deuda: 0 }])} />

      {/* Tu operación normal */}
      <Texto variante="subtitulo">{t('negocioApp.arranque.operacion')}</Texto>
      <CampoDinero etiqueta={t('negocioApp.arranque.ventasMes')} valor={conf.ventas_mes ?? 0} separador={separador} onCambio={(v) => cambiarConf({ ventas_mes: v })} />
      <CampoDinero etiqueta={t('negocioApp.arranque.fijosMes')} valor={conf.fijos_mes ?? 0} separador={separador} onCambio={(v) => cambiarConf({ fijos_mes: v })} />
      <CampoTexto
        etiqueta={t('negocioApp.arranque.costoPorcentaje')}
        ayuda={t('negocioApp.arranque.costoAyuda')}
        keyboardType="number-pad"
        value={costoTexto}
        placeholder="45"
        onChangeText={(v) => {
          const limpio = v.replace(/\D/g, '').slice(0, 2);
          setCostoTexto(limpio);
          cambiarConf({ costo_porcentaje: limpio ? parseInt(limpio, 10) : undefined });
        }}
      />
      <Texto variante="fuerte">{t('negocioApp.arranque.regimen')}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {REGIMENES.map((r) => (
          <Chip key={r} texto={t(`negocioApp.regimenes.${r}`)} elegido={regimen === r} onPress={() => setRegimen(r)} />
        ))}
      </View>
      <Texto variante="fuerte">{t('negocioApp.arranque.grupo')}</Texto>
      <View style={{ gap: ESPACIO.s }} accessibilityRole="radiogroup">
        {GRUPOS.map((g) => (
          <Chip key={g} texto={t(`negocioApp.grupos.g${g}`)} elegido={conf.grupo_actividad === g} onPress={() => cambiarConf({ grupo_actividad: g })} />
        ))}
      </View>

      {/* Resumen */}
      <Tarjeta style={{ gap: ESPACIO.xs }}>
        <Texto variante="subtitulo">{t('negocioApp.arranque.resumen')}</Texto>
        {[
          [t('negocioApp.arranque.resumenTienes'), resumen.tienes, colores.ingresoTexto],
          [t('negocioApp.arranque.resumenDebes'), resumen.debes, resumen.debes > 0 ? colores.errorTexto : colores.texto],
          [t('negocioApp.arranque.resumenPatrimonio'), resumen.patrimonio, resumen.patrimonio < 0 ? colores.errorTexto : colores.texto],
        ].map(([etiqueta, valor, color]) => (
          <View key={etiqueta as string} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: ESPACIO.xs }}>
            <Texto variante="medio">{etiqueta as string}</Texto>
            <Texto style={{ fontFamily: FUENTES.titulo, fontSize: 16 }} color={color as string}>
              {plata(valor as number)}
            </Texto>
          </View>
        ))}
      </Tarjeta>

      {mensaje && <Aviso mensaje={mensaje.texto} tipo={mensaje.tipo} />}
      <Boton titulo={t('negocioApp.arranque.guardar')} onPress={guardar} cargando={guardando} />
    </PantallaAjuste>
  );
}
