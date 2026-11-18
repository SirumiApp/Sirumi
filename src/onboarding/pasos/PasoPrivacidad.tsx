import { useState } from 'react';
import { View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Boton } from '@/components/Boton';
import { Casilla } from '@/components/Casilla';
import { Texto } from '@/components/Texto';
import { ESPACIO } from '@/theme';

import type { Consentimientos } from '../datos';
import { EncabezadoPaso, type PropsPaso } from './comun';
import { ModalPolitica, type TipoPolitica } from './ModalPolitica';

const CASILLAS: { clave: keyof Consentimientos; titulo: string; detalle: string; obligatoria: boolean }[] = [
  { clave: 'terminos', titulo: 'Acepto los Términos y la Política de privacidad', detalle: 'Obligatorio para crear tu cuenta.', obligatoria: true },
  { clave: 'datos', titulo: 'Autorizo el tratamiento de mis datos personales', detalle: 'Para que la app funcione y proteja tu cuenta.', obligatoria: true },
  {
    clave: 'ia',
    titulo: 'Permito que la IA lea los archivos que yo suba',
    detalle: 'Opcional. Se usa para leer tus Excel y responder tus preguntas. Siempre confirmas antes de guardar.',
    obligatoria: false,
  },
  { clave: 'novedades', titulo: 'Quiero recibir consejos y novedades', detalle: 'Opcional. Puedes cancelarlo cuando quieras.', obligatoria: false },
];

export function faltanObligatorias(c: Consentimientos): boolean {
  return !c.terminos || !c.datos;
}

export function PasoPrivacidad({ d, cambiar, intentado }: PropsPaso) {
  const [politica, setPolitica] = useState<TipoPolitica | null>(null);
  const c = d.consentimientos;

  return (
    <>
      <EncabezadoPaso
        emoji="candado"
        titulo="Tus datos, tu control"
        detalle="Antes de crear tu cuenta necesitamos tu autorización. Puedes consultar, corregir o eliminar tus datos cuando quieras."
      />

      <View style={{ gap: ESPACIO.xs }}>
        <Boton titulo="Leer la política de tratamiento de datos (Colombia)" variante="texto" onPress={() => setPolitica('co')} />
        <Boton titulo="Leer la política de privacidad (internacional)" variante="texto" onPress={() => setPolitica('int')} />
        <Texto variante="pequeno" style={{ textAlign: 'center' }}>
          Borrador pendiente de revisión legal. Los datos entre corchetes se completan antes de publicar.
        </Texto>
      </View>

      <View style={{ gap: ESPACIO.s }}>
        {CASILLAS.map((casilla) => (
          <Casilla
            key={casilla.clave}
            titulo={casilla.titulo}
            detalle={casilla.detalle}
            marcada={c[casilla.clave]}
            conError={intentado && casilla.obligatoria && !c[casilla.clave]}
            onPress={() => cambiar({ consentimientos: { ...c, [casilla.clave]: !c[casilla.clave] } })}
          />
        ))}
      </View>

      {intentado && faltanObligatorias(c) && <Aviso mensaje="Acepta los dos primeros puntos para continuar." />}

      <ModalPolitica abierta={politica} onCerrar={() => setPolitica(null)} />
    </>
  );
}
