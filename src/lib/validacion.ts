export const LARGO_MINIMO_CONTRASENA = 8;

/** Devuelve un mensaje de error en español, o null si el correo está bien escrito. */
export function validarCorreo(correo: string): string | null {
  const limpio = correo.trim();
  if (!limpio) return 'Escribe tu correo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)) return 'Escribe un correo válido.';
  return null;
}

export function validarContrasena(contrasena: string): string | null {
  if (!contrasena) return 'Escribe tu contraseña.';
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    return `Usa al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  }
  return null;
}

export function validarNombre(nombre: string): string | null {
  return nombre.trim().length < 2 ? 'Escribe tu nombre.' : null;
}

export function validarCodigo(codigo: string): string | null {
  return /^\d{6}$/.test(codigo.trim()) ? null : 'El código tiene 6 números.';
}

/** Traduce los errores de Supabase Auth a frases simples para la persona. */
export function traducirErrorAuth(error: { code?: string; message?: string; status?: number } | null): string {
  if (!error) return 'Algo salió mal. Intenta de nuevo.';
  switch (error.code) {
    case 'invalid_credentials':
      return 'El correo o la contraseña no coinciden.';
    case 'email_not_confirmed':
      return 'Primero confirma tu correo con el mensaje que te enviamos.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Ya hay una cuenta con ese correo. Intenta entrar.';
    case 'weak_password':
      return `Esa contraseña es muy fácil de adivinar. Usa al menos ${LARGO_MINIMO_CONTRASENA} caracteres y mezcla letras y números.`;
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentar.';
    case 'otp_expired':
      return 'El código venció o no es correcto. Pide uno nuevo.';
    case 'email_address_invalid':
      return 'Escribe un correo válido.';
    case 'signup_disabled':
      return 'Por ahora no se pueden crear cuentas nuevas.';
  }
  if (error.message?.toLowerCase().includes('network') || error.status === 0) {
    return 'No hay conexión a internet. Revisa tu señal e intenta de nuevo.';
  }
  return 'Algo salió mal. Intenta de nuevo.';
}
