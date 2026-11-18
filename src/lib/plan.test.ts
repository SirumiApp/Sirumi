// Pruebas de las reglas A4 (plan del mes) y A5 (meta con fecha) de docs/reglas-de-calculo.md.
// Cada ejemplo del documento es una prueba. Si cambia la regla, se cambia primero el documento.
import { describe, expect, it } from '@jest/globals';

import { es } from '@/i18n/es';

import {
  abonarAMeta,
  cuotaMensualMeta,
  disponibleParaGastar,
  estadoDelPlan,
  leQueda,
  montoASeparar,
  porDia,
  progresoMeta,
  validarPlan,
} from './plan';

describe('A4 · Plan del mes', () => {
  it('ejemplo del documento: ingreso 6.000.000 y ahorro 2.000.000 → disponible 4.000.000', () => {
    expect(disponibleParaGastar(6_000_000, 2_000_000)).toBe(4_000_000);
  });

  it('ejemplo del documento: día 15 de un mes de 30, gastado 1.800.000 → le quedan 2.200.000 y 137.500 por día', () => {
    const disponible = disponibleParaGastar(6_000_000, 2_000_000);
    const queda = leQueda(disponible, 1_800_000);
    expect(queda).toBe(2_200_000);
    expect(porDia(queda, { diasDelMes: 30, diaDeHoy: 15 })).toBe(137_500); // 2.200.000 / 16
  });

  it('el último día del mes, todo lo que queda es para ese día', () => {
    expect(porDia(300_000, { diasDelMes: 30, diaDeHoy: 30 })).toBe(300_000);
  });

  it('no redondea en pasos intermedios (se redondea solo al mostrar)', () => {
    expect(porDia(1_000_000, { diasDelMes: 31, diaDeHoy: 29 })).toBeCloseTo(333_333.33, 2);
  });

  describe('estado del plan', () => {
    // El estado es un código; el texto ("Vas bien", "Cuidado", "Te pasaste") está en los textos de la app.
    const texto = (gastado: number) => es.plan.estado[estadoDelPlan(4_000_000, gastado)];
    it('"Vas bien" si gastó menos del 80% del disponible', () => {
      expect(texto(1_800_000)).toBe('Vas bien');
    });
    it('"Cuidado" desde el 80% del disponible', () => {
      expect(texto(3_200_000)).toBe('Cuidado');
      expect(texto(4_000_000)).toBe('Cuidado');
    });
    it('"Te pasaste" si le queda menos de 0', () => {
      expect(texto(4_000_001)).toBe('Te pasaste');
    });
  });
});

describe('A5 · Meta con fecha', () => {
  it('ejemplo del documento: 4.000.000 en 8 meses → 500.000 al mes', () => {
    expect(cuotaMensualMeta(4_000_000, 8)).toBe(500_000);
  });

  it('la cuota se redondea hacia arriba (techo)', () => {
    expect(cuotaMensualMeta(1_000_000, 3)).toBe(333_334);
  });

  it('sin meses no hay cuota', () => {
    expect(cuotaMensualMeta(1_000_000, 0)).toBe(0);
  });

  it('progreso = mín(100, redondear(ahorrado / objetivo × 100))', () => {
    expect(progresoMeta(1_000_000, 4_000_000)).toBe(25);
    expect(progresoMeta(1_000_000, 3_000_000)).toBe(33);
    expect(progresoMeta(5_000_000, 4_000_000)).toBe(100);
  });

  it('abonar nunca supera el objetivo', () => {
    expect(abonarAMeta(3_800_000, 500_000, 4_000_000)).toBe(4_000_000);
    expect(abonarAMeta(1_000_000, 500_000, 4_000_000)).toBe(1_500_000);
  });
});

describe('Plan del onboarding (paso 5): monto a separar y validación', () => {
  it('ahorrar cada mes: separa lo que quiere ahorrar', () => {
    expect(montoASeparar({ objetivo: 'ahorro', ahorro: 2_000_000 })).toBe(2_000_000);
  });
  it('salir de deudas: separa el abono', () => {
    expect(montoASeparar({ objetivo: 'deudas', abono: 800_000 })).toBe(800_000);
  });
  it('meta puntual: separa la cuota mensual (A5)', () => {
    expect(montoASeparar({ objetivo: 'meta', metaValor: 4_000_000, metaMeses: 8 })).toBe(500_000);
  });

  it('el plan es válido solo si 0 < monto < ingreso', () => {
    const mensaje = (ingreso: number, monto: number) => {
      const codigo = validarPlan(ingreso, monto);
      return codigo ? es.errores[codigo] : null;
    };
    expect(mensaje(6_000_000, 2_000_000)).toBeNull();
    expect(mensaje(0, 2_000_000)).toBe('Escribe cuánto ganas al mes.');
    expect(mensaje(6_000_000, 0)).toBe('Escribe el monto para calcular tu plan.');
    expect(mensaje(6_000_000, 6_000_000)).toBe('Ese monto es igual o mayor a lo que ganas. Prueba con uno menor.');
    expect(mensaje(6_000_000, 7_000_000)).toBe('Ese monto es igual o mayor a lo que ganas. Prueba con uno menor.');
  });

  it('con la meta del documento: gana 6.000.000 y la meta pide 500.000 → puede gastar 5.500.000', () => {
    const separar = montoASeparar({ objetivo: 'meta', metaValor: 4_000_000, metaMeses: 8 });
    expect(validarPlan(6_000_000, separar)).toBeNull();
    expect(disponibleParaGastar(6_000_000, separar)).toBe(5_500_000);
  });
});
