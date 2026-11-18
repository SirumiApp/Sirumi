import { describe, expect, it } from '@jest/globals';

import { es } from '@/i18n/es';

import { traducirErrorAuth, validarCodigo, validarContrasena, validarCorreo, validarNombre } from './validacion';

describe('validarCorreo', () => {
  it('acepta correos bien escritos, con espacios alrededor', () => {
    expect(validarCorreo('nico@gmail.com')).toBeNull();
    expect(validarCorreo('  ana.perez@empresa.com.co ')).toBeNull();
  });
  it('rechaza correos vacíos o mal escritos', () => {
    expect(validarCorreo('')).toBe('correoVacio');
    expect(validarCorreo('nico@gmail')).toBe('correoInvalido');
    expect(validarCorreo('nico gmail.com')).toBe('correoInvalido');
    expect(es.errores.correoInvalido).toBe('Escribe un correo válido.');
  });
});

describe('validarContrasena', () => {
  it('pide mínimo 8 caracteres', () => {
    expect(validarContrasena('')).toBe('contrasenaVacia');
    expect(validarContrasena('1234567')).toBe('contrasenaCorta');
    expect(validarContrasena('12345678')).toBeNull();
  });
});

describe('validarNombre y validarCodigo', () => {
  it('valida el nombre', () => {
    expect(validarNombre(' ')).toBe('nombre');
    expect(validarNombre('Nico')).toBeNull();
  });
  it('el código son 6 números', () => {
    expect(validarCodigo('123456')).toBeNull();
    expect(validarCodigo('12345')).toBe('codigo');
    expect(validarCodigo('12a456')).toBe('codigo');
  });
});

describe('traducirErrorAuth', () => {
  it('traduce los errores comunes', () => {
    expect(traducirErrorAuth({ code: 'invalid_credentials' })).toBe('credenciales');
    expect(es.errores.credenciales).toBe('El correo o la contraseña no coinciden.');
    expect(traducirErrorAuth({ code: 'user_already_exists' })).toBe('correoExiste');
  });
  it('tiene un mensaje por defecto', () => {
    expect(traducirErrorAuth({ code: 'algo_raro' })).toBe('generico');
    expect(traducirErrorAuth(null)).toBe('generico');
  });
});
