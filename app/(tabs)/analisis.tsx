import { PantallaApp } from '@/components/PantallaApp';
import { usePersonal } from '@/personal/contexto';
import { VistaAnalisis } from '@/personal/VistaAnalisis';

/** Personal · Análisis. */
export default function AnalisisPersonal() {
  const { categorias, topes, alerta, version } = usePersonal();
  return (
    <PantallaApp>
      <VistaAnalisis categorias={categorias} topes={topes} alerta={alerta} version={version} />
    </PantallaApp>
  );
}
