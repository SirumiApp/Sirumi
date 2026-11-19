import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useUsoApp, veNegocio, vePersonal } from '@/auth/modo';
import { usePerfil } from '@/auth/perfil';
import { useModoEjemplo } from '@/ejemplo/modo';
import { perfilTributario } from '@/impuestos/perfil';
import { vencimientos } from '@/lib/calendarioTributario';
import { hoyEn, sumarDias } from '@/lib/fechas';
import { recordatoriosDeExtractos, recordatoriosDeImpuestos, recordatoriosDeRecurrentes } from '@/lib/recordatorios';
import { useNegocio } from '@/negocio/contexto';
import { usePlata, useTextosFecha } from '@/personal/ganchos';

import { programarAvisos, quitarRecordatorios, type AvisoLocal } from '.';

type Preferencias = { notificaciones?: { recordatorios?: boolean; impuestos?: boolean; extractos?: boolean } };

/**
 * Programa en el celular todos los recordatorios locales a las 9 a. m.: pagos recurrentes (B10),
 * impuestos (B12) y "sube tus extractos" (B9). Cada uno se puede apagar en Ajustes.
 */
export function ProgramadorAvisos() {
  const { t } = useTranslation();
  const perfil = usePerfil();
  const uso = useUsoApp();
  const ejemplo = useModoEjemplo();
  const plata = usePlata();
  const textosFecha = useTextosFecha();
  const { negocio, recurrentes, movimientos, parametros, cargando } = useNegocio();
  const pref = (perfil?.preferences as Preferencias | null)?.notificaciones ?? {};
  const conRecurrentes = pref.recordatorios !== false;
  const conImpuestos = pref.impuestos !== false;
  const conExtractos = pref.extractos !== false;
  const dueno = negocio?.rol === 'owner';

  useEffect(() => {
    if (ejemplo || cargando || !perfil || !uso || uso === 'vendedor') return;
    const hoy = hoyEn();
    const lista: AvisoLocal[] = [];
    const mesLargo = (mes: string) => {
      const [anio, m] = mes.split('-').map(Number);
      return `${textosFecha.mesesLargos[m - 1]} ${anio}`;
    };
    if (dueno && conRecurrentes) {
      for (const r of recordatoriosDeRecurrentes(recurrentes, movimientos, hoy)) {
        lista.push({
          clave: r.clave,
          fecha: r.fecha,
          titulo: t(r.fecha === hoy ? 'notificaciones.recurrenteHoy' : 'notificaciones.recurrente'),
          cuerpo: `${r.recurrente.nombre} · ${plata(r.recurrente.monto)}`,
          data: { tipo: 'recurrente', recurrente: r.recurrente.id },
        });
      }
    }
    if (dueno && negocio && conImpuestos) {
      const v = vencimientos(perfilTributario(negocio), hoy, sumarDias(hoy, 120), parametros?.calendario);
      for (const r of recordatoriosDeImpuestos(v, hoy)) {
        const nombre = t(`impuestos.obligaciones.${r.vencimiento.obligacion}.nombre`);
        lista.push({
          clave: r.clave,
          fecha: r.fecha,
          titulo: t(`notificaciones.impuesto.${r.cuando}`, { nombre }),
          cuerpo: t(`notificaciones.impuesto.${r.cuando}Detalle`, { nombre, negocio: negocio.nombre }),
          data: { tipo: 'impuesto' },
        });
      }
    }
    if (conExtractos) {
      const ambito = dueno && veNegocio(uso) ? 'negocio' : vePersonal(uso) ? 'personal' : null;
      if (ambito) {
        for (const r of recordatoriosDeExtractos(hoy)) {
          lista.push({
            clave: r.clave,
            fecha: r.fecha,
            titulo: t('notificaciones.extracto', { mes: mesLargo(r.mes) }),
            cuerpo: t('notificaciones.extractoDetalle'),
            data: { tipo: 'extracto', ambito },
          });
        }
      }
    }
    if (lista.length === 0) quitarRecordatorios();
    else programarAvisos(lista);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `plata`, `t` y los textos cambian en cada render; basta con los datos
  }, [ejemplo, cargando, !!perfil, uso, dueno, negocio, recurrentes, movimientos, parametros, conRecurrentes, conImpuestos, conExtractos]);

  return null;
}
