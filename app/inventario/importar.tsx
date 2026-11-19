import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { compartirArchivo, leerArchivoCsv } from '@/ajustes/archivos';
import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { PantallaAjuste } from '@/components/PantallaAjuste';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { avisarEjemplo, useModoEjemplo } from '@/ejemplo/modo';
import { leerCatalogo, type ErrorCatalogo, type ProductoCatalogo } from '@/lib/catalogo';
import { useNegocio } from '@/negocio/contexto';
import { crearProducto, leerErrorInventario } from '@/negocio/inventarioDatos';
import { ESPACIO, useTema } from '@/theme';

type Lectura = { productos: ProductoCatalogo[]; errores: ErrorCatalogo[]; omitidos: string[] };

/** Importar el catálogo desde un CSV (spec 04, §2; regla C8). Todo entra a la bodega principal. */
export default function ImportarCatalogo() {
  const { t } = useTranslation();
  const { colores } = useTema();
  const ejemplo = useModoEjemplo();
  const { negocio, bodegas, productos, actualizar } = useNegocio();
  const principal = bodegas.find((b) => b.principal) ?? bodegas[0];
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'error' | 'info' } | null>(null);
  const [progreso, setProgreso] = useState<{ n: number; total: number } | null>(null);

  async function plantilla() {
    const csv = ['nombre;coleccion;precio;costo;talla;color;codigo;cantidad;minimo', t('inventario.importar.ejemplo1'), t('inventario.importar.ejemplo2')].join('\r\n');
    await compartirArchivo('plantilla-catalogo-sirumi.csv', csv, 'text/csv');
  }

  async function elegir() {
    setAviso(null);
    try {
      const texto = await leerArchivoCsv();
      if (texto === null) return;
      const codigos = new Set(productos.flatMap((p) => p.variantes.map((v) => v.codigo).filter((c): c is string => !!c)));
      setLectura(leerCatalogo(texto, productos.map((p) => p.nombre), codigos));
    } catch {
      setAviso({ texto: t('inventario.importar.errorArchivo'), tipo: 'error' });
    }
  }

  async function importar() {
    if (ejemplo) return avisarEjemplo();
    if (!negocio || !lectura || !principal) return;
    const fallaron: string[] = [];
    let listos = 0;
    for (const [i, p] of lectura.productos.entries()) {
      setProgreso({ n: i + 1, total: lectura.productos.length });
      const { error } = await crearProducto(negocio.id, {
        nombre: p.nombre,
        coleccion: p.coleccion ?? '',
        emoji: 'paquete',
        precio: p.precio,
        costo: p.costo,
        desglose: null,
        minimo: p.minimo,
        bodega: principal.id,
        variantes: p.variantes.map((v) => ({ color: v.color, talla: v.talla, codigo: v.codigo, cantidad: v.cantidad })),
      });
      if (leerErrorInventario(error)) fallaron.push(p.nombre);
      else listos++;
    }
    setProgreso(null);
    setLectura(null);
    actualizar();
    setAviso({
      texto: [t('inventario.importar.listo', { count: listos }), fallaron.length ? t('inventario.importar.fallaron', { nombres: fallaron.join(', ') }) : ''].filter(Boolean).join(' '),
      tipo: fallaron.length ? 'error' : 'info',
    });
  }

  return (
    <PantallaAjuste titulo={t('inventario.importar.titulo')} detalle={t('inventario.importar.detalle')}>
      <Texto variante="pequeno">{t('inventario.importar.columnas')}</Texto>
      <Boton titulo={t('inventario.importar.plantilla')} variante="secundario" onPress={plantilla} />
      <Boton titulo={t('inventario.importar.elegir')} onPress={elegir} />

      {lectura && (
        <Tarjeta style={{ gap: ESPACIO.s }}>
          <Texto variante="subtitulo">{t('inventario.importar.listos', { count: lectura.productos.length })}</Texto>
          {lectura.productos.slice(0, 8).map((p) => (
            <Texto key={p.nombre} variante="pequeno">
              • {p.nombre} ({p.variantes.length})
            </Texto>
          ))}
          {lectura.productos.length > 8 && <Texto variante="pequeno">…</Texto>}
          {principal && lectura.productos.length > 0 && <Texto variante="pequeno">{t('inventario.importar.bodega', { bodega: principal.nombre })}</Texto>}
          {lectura.omitidos.length > 0 && <Texto variante="pequeno">{t('inventario.importar.omitidos', { nombres: lectura.omitidos.join(', ') })}</Texto>}
          {lectura.errores.length > 0 && (
            <View style={{ gap: 2, padding: ESPACIO.m, borderRadius: 16, backgroundColor: colores.errorFondo }}>
              {lectura.errores.slice(0, 10).map((e) => (
                <Texto key={`${e.fila}-${e.codigo}`} variante="pequeno" color={colores.errorTexto}>
                  {t('inventario.importar.fila', { fila: e.fila, motivo: t(`inventario.importar.motivos.${e.codigo}`, { nombre: e.nombre, valor: e.valor }) })}
                </Texto>
              ))}
            </View>
          )}
          {lectura.productos.length > 0 && (
            <Boton
              titulo={progreso ? t('inventario.importar.importando', progreso) : t('inventario.importar.importar', { count: lectura.productos.length })}
              cargando={!!progreso}
              onPress={importar}
            />
          )}
        </Tarjeta>
      )}

      {aviso && <Aviso mensaje={aviso.texto} tipo={aviso.tipo} />}
    </PantallaAjuste>
  );
}
