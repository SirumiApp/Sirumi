import { PantallaApp } from '@/components/PantallaApp';
import { usePersonal } from '@/personal/contexto';
import { VistaInicio } from '@/personal/VistaInicio';

/** Personal · Inicio. */
export default function InicioPersonal() {
  const { categorias, topes, alerta, version, abrirHoja } = usePersonal();
  return (
    <PantallaApp>
      <VistaInicio categorias={categorias} topes={topes} alerta={alerta} version={version} onEditar={abrirHoja} />
    </PantallaApp>
  );
}
