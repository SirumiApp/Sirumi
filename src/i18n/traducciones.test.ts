// Protege las traducciones: el inglés debe tener exactamente los mismos textos que el español,
// con las mismas variables ({{nombre}}, {{min}}…), y los mensajes que exige la especificación no cambian.
import { describe, expect, it } from '@jest/globals';

import { en } from './en';
import { es } from './es';

type Arbol = { [clave: string]: string | Arbol };

function aplanar(arbol: Arbol, prefijo = ''): Record<string, string> {
  return Object.entries(arbol).reduce<Record<string, string>>((acc, [clave, valor]) => {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    return typeof valor === 'string' ? { ...acc, [ruta]: valor } : { ...acc, ...aplanar(valor, ruta) };
  }, {});
}

const variables = (texto: string) => (texto.match(/{{\s*\w+\s*}}/g) ?? []).map((v) => v.replace(/\s/g, '')).sort();

describe('traducciones', () => {
  const textosEs = aplanar(es as unknown as Arbol);
  const textosEn = aplanar(en as unknown as Arbol);

  it('inglés y español tienen las mismas claves', () => {
    expect(Object.keys(textosEn).sort()).toEqual(Object.keys(textosEs).sort());
  });

  it('ningún texto está vacío', () => {
    for (const [clave, texto] of [...Object.entries(textosEs), ...Object.entries(textosEn)]) {
      expect(`${clave}: ${texto.trim()}`).not.toBe(`${clave}: `);
    }
  });

  it('cada texto usa las mismas variables en los dos idiomas', () => {
    for (const clave of Object.keys(textosEs)) {
      expect({ clave, variables: variables(textosEn[clave] ?? '') }).toEqual({ clave, variables: variables(textosEs[clave]) });
    }
  });

  it('los mensajes del plan son los de docs/specs/01-onboarding.md', () => {
    expect(es.errores.planSinIngreso).toBe('Escribe cuánto ganas al mes.');
    expect(es.errores.planSinMonto).toBe('Escribe el monto para calcular tu plan.');
    expect(es.errores.planMontoMayor).toBe('Ese monto es igual o mayor a lo que ganas. Prueba con uno menor.');
  });

  it('los estados del plan son los de docs/reglas-de-calculo.md (A4)', () => {
    expect(es.plan.estado).toEqual({ bien: 'Vas bien', cuidado: 'Cuidado', tePasaste: 'Te pasaste' });
  });

  it('las casillas obligatorias dicen lo que pide la especificación', () => {
    expect(es.onboarding.privacidad.casillas.terminos.titulo).toBe('Acepto los Términos y la Política de privacidad');
    expect(es.onboarding.privacidad.casillas.datos.titulo).toBe('Autorizo el tratamiento de mis datos personales');
  });
});
