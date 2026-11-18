import { describe, expect, it } from '@jest/globals';

import { traducirErrorAuth, validarCodigo, validarContrasena, validarCorreo, validarNombre } from './validacion';

describe('validarCorreo', () => {
  it('acepta correos bien escritos, con espacios alrededor', () => {
    expect(validarCorreo('nico@gmail.com')).toBeNull();
    expect(validarCorreo('  ana.perez@empresa.com.co ')).toBeNull();
  });
  it('rechaza correos vacíos o mal escritos', () => {
    expect(validarCorreo('')).toBe('Escribe tu correo.');
    expect(validarCorreo('nico@gmail')).toBe('Escribe un correo válido.');
    expect(validarCorreo('nico gmail.com')).toBe('Escribe un correo válido.');
  });
});

describe('validarContrasena', () => {
  it('pide mínimo 8 caracteres', () => {
    expect(validarContrasena('')).toBe('Escribe tu contraseña.');
    expect(validarContrasena('1234567')).toBe('Usa al menos 8 caracteres.');
    expect(validarContrasena('12345678')).toBeNull();
  });
});

describe('validarNombre y validarCodigo', () => {
  it('valida el nombre', () => {
    expect(validarNombre(' ')).toBe('Escribe tu nombre.');
    expect(validarNombre('Nico')).toBeNull();
  });
  it('el código son 6 números', () => {
    expect(validarCodigo('123456')).toBeNull();
    expect(validarCodigo('12345')).not.toBeNull();
    expect(validarCodigo('12a456')).not.toBeNull();
  });
});

describe('traducirErrorAuth', () => {
  it('traduce los errores comunes', () => {
    expect(traducirErrorAuth({ code: 'invalid_credentials' })).toBe('El correo o la contraseña no coinciden.');
    expect(traducirErrorAuth({ code: 'user_already_exists' })).toContain('Ya hay una cuenta');
  });
  it('tiene un mensaje por defecto', () => {
    expect(traducirErrorAuth({ code: 'algo_raro' })).toBe('Algo salió mal. Intenta de nuevo.');
    expect(traducirErrorAuth(null)).toBe('Algo salió mal. Intenta de nuevo.');
  });
});
