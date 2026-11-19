import { PantallaApp } from '@/components/PantallaApp';
import { usePersonal } from '@/personal/contexto';
import { VistaInicio } from '@/personal/VistaInicio';
import { SoloSi } from '@/components/SoloSi';

/** Personal · Inicio. */
function InicioPersonalContenido() {
  const { categorias, topes, alerta, version, abrirHoja } = usePersonal();
  return (
    <PantallaApp>
      <VistaInicio categorias={categorias} topes={topes} alerta={alerta} version={version} onEditar={abrirHoja} />
    </PantallaApp>
  );
}

export default function InicioPersonal() {
  return (
    <SoloSi parte="personal">
      <InicioPersonalContenido />
    </SoloSi>
  );
}
