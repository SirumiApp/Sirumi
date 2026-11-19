import type { Objetivo } from '@/lib/plan';

/** 'vendedor': le dieron un código para vender en el negocio de alguien (solo ve ese POS). */
export type Uso = 'personal' | 'negocio' | 'ambos' | 'vendedor';
export type Paso = 'pais' | 'datos' | 'uso' | 'objetivo' | 'plan' | 'privacidad' | 'listo';

/** Los pasos que ve la persona según lo que eligió (docs/specs/01-onboarding.md). */
export function caminoDePasos(uso: Uso, objetivo: Objetivo): Paso[] {
  const incluyePersonal = uso === 'personal' || uso === 'ambos';
  return [
    'pais',
    'datos',
    'uso',
    ...(incluyePersonal ? (['objetivo'] as Paso[]) : []),
    ...(incluyePersonal && objetivo !== 'ver' ? (['plan'] as Paso[]) : []),
    'privacidad',
    'listo',
  ];
}

export function pasoSiguiente(actual: Paso, uso: Uso, objetivo: Objetivo): Paso {
  const camino = caminoDePasos(uso, objetivo);
  return camino[Math.min(camino.indexOf(actual) + 1, camino.length - 1)];
}

export function pasoAnterior(actual: Paso, uso: Uso, objetivo: Objetivo): Paso {
  const camino = caminoDePasos(uso, objetivo);
  return camino[Math.max(camino.indexOf(actual) - 1, 0)];
}
