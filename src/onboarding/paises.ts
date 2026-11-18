import type { Traducciones } from '@/i18n/es';
import type { CodigoError } from '@/lib/validacion';

export type CodigoPais = keyof Traducciones['paises'];
export type CodigoDocumento = keyof Traducciones['documentos'];

export type Pais = {
  /** El nombre se muestra con t(`paises.${codigo}`). */
  codigo: CodigoPais;
  bandera: string;
  moneda: string;
  prefijo: string;
  /** Separador de miles al mostrar montos. */
  separador: '.' | ',';
  /** Se muestran con t(`documentos.${codigo}`) y se guarda el código. */
  documentos: CodigoDocumento[];
};

/** Los 10 países del onboarding. Las banderas sí van como emoji del sistema. */
export const PAISES: Pais[] = [
  { codigo: 'CO', bandera: '🇨🇴', moneda: 'COP', prefijo: '+57', separador: '.', documentos: ['cc', 'ce', 'pasaporte', 'ppt'] },
  { codigo: 'US', bandera: '🇺🇸', moneda: 'USD', prefijo: '+1', separador: ',', documentos: ['id_estatal', 'pasaporte'] },
  { codigo: 'MX', bandera: '🇲🇽', moneda: 'MXN', prefijo: '+52', separador: ',', documentos: ['curp', 'ine', 'pasaporte'] },
  { codigo: 'AR', bandera: '🇦🇷', moneda: 'ARS', prefijo: '+54', separador: '.', documentos: ['dni', 'pasaporte'] },
  { codigo: 'CL', bandera: '🇨🇱', moneda: 'CLP', prefijo: '+56', separador: '.', documentos: ['rut', 'pasaporte'] },
  { codigo: 'PE', bandera: '🇵🇪', moneda: 'PEN', prefijo: '+51', separador: ',', documentos: ['dni', 'pasaporte'] },
  { codigo: 'EC', bandera: '🇪🇨', moneda: 'USD', prefijo: '+593', separador: ',', documentos: ['cedula', 'pasaporte'] },
  { codigo: 'PA', bandera: '🇵🇦', moneda: 'USD', prefijo: '+507', separador: ',', documentos: ['cedula', 'pasaporte'] },
  { codigo: 'BR', bandera: '🇧🇷', moneda: 'BRL', prefijo: '+55', separador: '.', documentos: ['cpf', 'pasaporte'] },
  { codigo: 'ES', bandera: '🇪🇸', moneda: 'EUR', prefijo: '+34', separador: '.', documentos: ['dni_nie', 'pasaporte'] },
];

export function paisPorCodigo(codigo: string): Pais {
  return PAISES.find((p) => p.codigo === codigo) ?? PAISES[0];
}

/** Solo los dígitos de lo que escribió la persona, con separadores del país: 1250000 → "1.250.000". */
export function separarMiles(valor: number, separador: '.' | ','): string {
  return Math.abs(Math.round(valor))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separador);
}

/** "$ 1.250.000" o "$ 1,250,000" según el país. Sin decimales. */
export function formatearMontoPais(valor: number, pais: Pais): string {
  return `${valor < 0 ? '-' : ''}$ ${separarMiles(valor, pais.separador)}`;
}

export function validarCelular(celular: string): CodigoError | null {
  return celular.replace(/\D/g, '').length >= 7 ? null : 'celular';
}
