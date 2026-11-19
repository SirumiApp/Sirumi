import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import type { Idioma } from '@/i18n';
import { disponibleParaGastar, montoASeparar, validarPlan, type Objetivo } from '@/lib/plan';
import { validarContrasena, validarCorreo, validarNombre, type CodigoError } from '@/lib/validacion';

import type { Uso } from './camino';
import { paisPorCodigo, validarCelular } from './paises';

export type Consentimientos = { terminos: boolean; datos: boolean; ia: boolean; novedades: boolean };

/** Todo lo que la persona escribe en el onboarding. Vive en un solo lugar para no perderlo al volver atrás. */
export type DatosOnboarding = {
  pais: string;
  nombre: string;
  correo: string;
  contrasena: string;
  celular: string;
  tipoDocumento: number;
  numeroDocumento: string;
  uso: Uso;
  negocio: string;
  /** Código de invitación (vendedor) y el negocio al que pertenece, cuando ya se revisó. */
  codigo: string;
  negocioDelCodigo: string | null;
  objetivo: Objetivo;
  ingreso: number;
  ahorro: number;
  abono: number;
  metaNombre: string;
  metaValor: number;
  metaMeses: number;
  consentimientos: Consentimientos;
};

export const DATOS_INICIALES: DatosOnboarding = {
  pais: 'CO',
  nombre: '',
  correo: '',
  contrasena: '',
  celular: '',
  tipoDocumento: 0,
  numeroDocumento: '',
  uso: 'ambos',
  negocio: '',
  codigo: '',
  negocioDelCodigo: null,
  objetivo: 'ahorro',
  ingreso: 0,
  ahorro: 0,
  abono: 0,
  metaNombre: '',
  metaValor: 0,
  metaMeses: 12,
  consentimientos: { terminos: false, datos: false, ia: false, novedades: false },
};

export const MESES_META = [3, 6, 12, 18, 24];

/** Código del error de cada campo; la pantalla lo muestra con t(`errores.${codigo}`). */
export type ErroresDatos = Partial<Record<'nombre' | 'correo' | 'celular' | 'contrasena', CodigoError>>;

export function erroresDatosPersonales(d: DatosOnboarding, opciones: { pideContrasena: boolean }): ErroresDatos {
  const errores: ErroresDatos = {};
  const nombre = validarNombre(d.nombre);
  const correo = validarCorreo(d.correo);
  const celular = validarCelular(d.celular);
  const contrasena = opciones.pideContrasena ? validarContrasena(d.contrasena) : null;
  if (nombre) errores.nombre = nombre;
  if (correo) errores.correo = correo;
  if (celular) errores.celular = celular;
  if (contrasena) errores.contrasena = contrasena;
  return errores;
}

export function incluyePersonal(d: DatosOnboarding): boolean {
  return d.uso !== 'negocio';
}

export function incluyeNegocio(d: DatosOnboarding): boolean {
  return d.uso === 'negocio' || d.uso === 'ambos';
}

/** Paso 5: cuánto separa, cuánto le queda para gastar (A4/A5) y si el plan es válido. */
export function planDelOnboarding(d: DatosOnboarding): { separar: number; disponible: number; error: CodigoError | null } {
  const separar = montoASeparar({
    objetivo: d.objetivo,
    ahorro: d.ahorro,
    abono: d.abono,
    metaValor: d.metaValor,
    metaMeses: d.metaMeses,
  });
  return { separar, disponible: disponibleParaGastar(d.ingreso, separar), error: validarPlan(d.ingreso, separar) };
}

const TEXTOS = { es, en };

/** Lo que recibe la función completar_onboarding de la base de datos. */
export function paraGuardar(d: DatosOnboarding, versionPolitica: string, idioma: Idioma) {
  const pais = paisPorCodigo(d.pais);
  const porDefecto = TEXTOS[idioma].onboarding.porDefecto;
  const numeroDocumento = d.numeroDocumento.trim();
  const conPlan = incluyePersonal(d);
  const tienePlan = conPlan && d.objetivo !== 'ver';
  const plan = tienePlan ? planDelOnboarding(d) : null;

  return {
    full_name: d.nombre.trim(),
    phone: `${pais.prefijo} ${d.celular.replace(/\D/g, '')}`,
    country: pais.codigo,
    currency: pais.moneda,
    document_type: numeroDocumento ? (pais.documentos[d.tipoDocumento] ?? null) : null,
    document_number: numeroDocumento || null,
    language: idioma,
    usage: d.uso,
    invite_code: d.uso === 'vendedor' ? d.codigo.trim().toUpperCase() : undefined,
    business_name: incluyeNegocio(d) ? d.negocio.trim() || porDefecto.negocio : null,
    warehouse_name: porDefecto.bodega,
    cash_account_name: porDefecto.efectivo,
    policy_version: versionPolitica,
    consents: { ...d.consentimientos },
    plan: !conPlan
      ? null
      : !plan
        ? { objetivo: d.objetivo }
        : {
            objetivo: d.objetivo,
            ingreso: d.ingreso,
            separar: plan.separar,
            disponible: plan.disponible,
            ...(d.objetivo === 'meta' ? { meta: { nombre: d.metaNombre.trim(), valor: d.metaValor, meses: d.metaMeses } } : {}),
          },
  };
}
