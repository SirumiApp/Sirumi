import { PantallaApp } from '@/components/PantallaApp';
import { usePersonal } from '@/personal/contexto';
import { VistaTopes } from '@/personal/VistaTopes';

/** Personal · Topes. */
export default function TopesPersonal() {
  const { categorias, topes, alerta, version, cambiarAlerta, actualizar } = usePersonal();
  return (
    <PantallaApp>
      <VistaTopes categorias={categorias} topes={topes} alerta={alerta} version={version} onCambiarAlerta={cambiarAlerta} onTopeGuardado={actualizar} />
    </PantallaApp>
  );
}
