import { useTranslation } from 'react-i18next';

import { usePerfil } from '@/auth/perfil';
import type { Traducciones } from '@/i18n/es';
import { formatearMontoPais, paisPorCodigo } from '@/onboarding/paises';

import type { Categoria } from './datos';
import type { TextosFecha } from './etiquetas';

type ClaveCategoria = keyof Traducciones['categorias'];

/** Meses y "Hoy/Ayer" en el idioma de la app. */
export function useTextosFecha(): TextosFecha {
  const { t } = useTranslation();
  return {
    hoy: t('fechas.hoy'),
    ayer: t('fechas.ayer'),
    mesesCortos: t('fechas.mesesCortos').split(','),
    mesesLargos: t('fechas.mesesLargos').split(','),
  };
}

/** Formatea plata con el separador del país de la persona: $ 1.250.000 o $ 1,250,000. */
export function usePlata(): (valor: number) => string {
  const perfil = usePerfil();
  const pais = paisPorCodigo(perfil?.country ?? 'CO');
  // Espacio que no se parte: "$ 110.000" nunca queda en dos renglones.
  return (valor: number) => formatearMontoPais(valor, pais).replace(/ /g, '\u00A0');
}

/** Nombre visible de una categoría: el que puso la persona o el de la app en su idioma. */
export function useNombreCategoria(): (c: Categoria | undefined) => string {
  const { t } = useTranslation();
  return (c) => {
    if (!c) return t('categorias.sinCategoria');
    if (c.name?.trim()) return c.name;
    return c.key ? t(`categorias.${c.key as ClaveCategoria}`) : t('categorias.sinCategoria');
  };
}
