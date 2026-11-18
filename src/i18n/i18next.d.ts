import 'i18next';

import type { Traducciones } from './es';

// Hace que t('clave') revise que la clave exista en los textos (error de TypeScript si no).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Traducciones };
    returnNull: false;
  }
}
