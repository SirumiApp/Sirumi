import { describe, expect, it } from '@jest/globals';

import { DATOS_INICIALES, erroresDatosPersonales, paraGuardar, planDelOnboarding, type DatosOnboarding } from './datos';

const base: DatosOnboarding = {
  ...DATOS_INICIALES,
  nombre: ' Nicolás Niño ',
  correo: ' Nico@Correo.com ',
  contrasena: 'clave-segura',
  celular: '300 123 4567',
  consentimientos: { terminos: true, datos: true, ia: false, novedades: true },
};

describe('erroresDatosPersonales (paso 2)', () => {
  it('sin errores cuando todo está bien', () => {
    expect(erroresDatosPersonales(base, { pideContrasena: true })).toEqual({});
  });
  it('marca cada campo que falta', () => {
    const errores = erroresDatosPersonales({ ...base, nombre: 'N', correo: 'x', celular: '123', contrasena: '123' }, { pideContrasena: true });
    expect(errores).toEqual({ nombre: 'nombre', correo: 'correoInvalido', celular: 'celular', contrasena: 'contrasenaCorta' });
  });
  it('no pide contraseña si ya tiene cuenta', () => {
    expect(erroresDatosPersonales({ ...base, contrasena: '' }, { pideContrasena: false })).toEqual({});
  });
});

describe('planDelOnboarding (paso 5, reglas A4 y A5)', () => {
  it('ahorro: gana 6.000.000 y ahorra 2.000.000 → máximo para gastar 4.000.000', () => {
    const plan = planDelOnboarding({ ...base, uso: 'personal', objetivo: 'ahorro', ingreso: 6_000_000, ahorro: 2_000_000 });
    expect(plan).toEqual({ separar: 2_000_000, disponible: 4_000_000, error: null });
  });
  it('meta: 4.000.000 en 8 meses → separa 500.000', () => {
    const plan = planDelOnboarding({ ...base, objetivo: 'meta', ingreso: 6_000_000, metaValor: 4_000_000, metaMeses: 8 });
    expect(plan).toEqual({ separar: 500_000, disponible: 5_500_000, error: null });
  });
  it('deudas: el abono no puede ser igual o mayor al ingreso', () => {
    const plan = planDelOnboarding({ ...base, objetivo: 'deudas', ingreso: 2_000_000, abono: 2_000_000 });
    expect(plan.error).toBe('planMontoMayor');
  });
});

describe('paraGuardar: lo que se manda a la base de datos', () => {
  it('limpia los datos y pone el prefijo del país al celular', () => {
    const d = paraGuardar({ ...base, uso: 'personal', objetivo: 'ver' }, 'v1', 'es');
    expect(d).toMatchObject({
      full_name: 'Nicolás Niño',
      phone: '+57 3001234567',
      country: 'CO',
      currency: 'COP',
      language: 'es',
      usage: 'personal',
      business_name: null,
      policy_version: 'v1',
      consents: { terminos: true, datos: true, ia: false, novedades: true },
      plan: { objetivo: 'ver' },
    });
  });
  it('el documento es opcional: si no hay número, no se guarda el tipo', () => {
    expect(paraGuardar(base, 'v1', 'es')).toMatchObject({ document_type: null, document_number: null });
    expect(paraGuardar({ ...base, tipoDocumento: 3, numeroDocumento: ' 123 ' }, 'v1', 'es')).toMatchObject({
      document_type: 'ppt',
      document_number: '123',
    });
  });
  it('con negocio guarda su nombre; con plan guarda los montos', () => {
    const d = paraGuardar(
      { ...base, uso: 'ambos', negocio: ' Tienda Luna ', objetivo: 'meta', ingreso: 6_000_000, metaNombre: ' Viaje ', metaValor: 4_000_000, metaMeses: 8 },
      'v1',
      'es',
    );
    expect(d.business_name).toBe('Tienda Luna');
    expect(d.plan).toEqual({ objetivo: 'meta', ingreso: 6_000_000, separar: 500_000, disponible: 5_500_000, meta: { nombre: 'Viaje', valor: 4_000_000, meses: 8 } });
  });
  it('solo negocio: no guarda plan personal', () => {
    expect(paraGuardar({ ...base, uso: 'negocio', negocio: 'X' }, 'v1', 'es').plan).toBeNull();
  });
  it('los nombres que se crean solos van en el idioma elegido', () => {
    expect(paraGuardar({ ...base, uso: 'negocio' }, 'v1', 'es')).toMatchObject({
      business_name: 'Mi negocio',
      warehouse_name: 'Bodega principal',
      cash_account_name: 'Efectivo',
    });
    expect(paraGuardar({ ...base, uso: 'negocio' }, 'v1', 'en')).toMatchObject({
      language: 'en',
      business_name: 'My business',
      warehouse_name: 'Main warehouse',
      cash_account_name: 'Cash',
    });
  });
});
