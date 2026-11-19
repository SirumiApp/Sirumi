import { describe, expect, it } from '@jest/globals';

import { usoDeApp, veNegocio, vePersonal } from './modo';

describe('qué parte de la app se ve según el onboarding', () => {
  it('solo personal no ve negocio; solo negocio no ve personal; las dos ven todo', () => {
    expect([vePersonal(usoDeApp('personal')), veNegocio(usoDeApp('personal'))]).toEqual([true, false]);
    expect([vePersonal(usoDeApp('negocio')), veNegocio(usoDeApp('negocio'))]).toEqual([false, true]);
    expect([vePersonal(usoDeApp('ambos')), veNegocio(usoDeApp('ambos'))]).toEqual([true, true]);
  });
  it('si no hay nada guardado se muestran las dos', () => {
    expect(usoDeApp(null)).toBe('ambos');
    expect(usoDeApp('otra cosa')).toBe('ambos');
  });
});
