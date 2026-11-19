import { PantallaApp } from '@/components/PantallaApp';
import { usePersonal } from '@/personal/contexto';
import { VistaTopes } from '@/personal/VistaTopes';
import { SoloSi } from '@/components/SoloSi';

/** Personal · Topes. */
function TopesPersonalContenido() {
  const { categorias, topes, alerta, version, cambiarAlerta, actualizar } = usePersonal();
  return (
    <PantallaApp>
      <VistaTopes categorias={categorias} topes={topes} alerta={alerta} version={version} onCambiarAlerta={cambiarAlerta} onTopeGuardado={actualizar} />
    </PantallaApp>
  );
}

export default function TopesPersonal() {
  return (
    <SoloSi parte="personal">
      <TopesPersonalContenido />
    </SoloSi>
  );
}
