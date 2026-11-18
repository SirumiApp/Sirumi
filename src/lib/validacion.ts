import type { Traducciones } from '@/i18n/es';

export const LARGO_MINIMO_CONTRASENA = 8;

/** Código de un mensaje de error: la pantalla lo muestra con t(`errores.${codigo}`, { min }). */
export type CodigoError = keyof Traducciones['errores'];

export function validarCorreo(correo: string): CodigoError | null {
  const limpio = correo.trim();
  if (!limpio) return 'correoVacio';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)) return 'correoInvalido';
  return null;
}

export function validarContrasena(contrasena: string): CodigoError | null {
  if (!contrasena) return 'contrasenaVacia';
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) return 'contrasenaCorta';
  return null;
}

export function validarNombre(nombre: string): CodigoError | null {
  return nombre.trim().length < 2 ? 'nombre' : null;
}

export function validarCodigo(codigo: string): CodigoError | null {
  return /^\d{6}$/.test(codigo.trim()) ? null : 'codigo';
}

/** Traduce los errores de Supabase Auth a un código de mensaje simple para la persona. */
export function traducirErrorAuth(error: { code?: string; message?: string; status?: number } | null): CodigoError {
  if (!error) return 'generico';
  switch (error.code) {
    case 'invalid_credentials':
      return 'credenciales';
    case 'email_not_confirmed':
      return 'correoSinConfirmar';
    case 'user_already_exists':
    case 'email_exists':
      return 'correoExiste';
    case 'weak_password':
      return 'contrasenaDebil';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'muchosIntentos';
    case 'otp_expired':
      return 'codigoVencido';
    case 'email_address_invalid':
      return 'correoInvalido';
    case 'signup_disabled':
      return 'registroCerrado';
  }
  if (error.message?.toLowerCase().includes('network') || error.status === 0) return 'sinConexion';
  return 'generico';
}
