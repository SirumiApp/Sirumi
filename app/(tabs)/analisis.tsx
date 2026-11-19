import { PantallaApp } from '@/components/PantallaApp';
import { usePersonal } from '@/personal/contexto';
import { VistaAnalisis } from '@/personal/VistaAnalisis';
import { SoloSi } from '@/components/SoloSi';

/** Personal · Análisis. */
function AnalisisPersonalContenido() {
  const { categorias, topes, alerta, version } = usePersonal();
  return (
    <PantallaApp>
      <VistaAnalisis categorias={categorias} topes={topes} alerta={alerta} version={version} />
    </PantallaApp>
  );
}

export default function AnalisisPersonal() {
  return (
    <SoloSi parte="personal">
      <AnalisisPersonalContenido />
    </SoloSi>
  );
}
