import { View } from 'react-native';

import { primerNombre, usePerfil } from '@/auth/perfil';
import { cerrarSesion } from '@/auth/sesion';
import { Boton } from '@/components/Boton';
import { PantallaVacia } from '@/components/PantallaVacia';

export default function PersonalPantalla() {
  const perfil = usePerfil();
  const nombre = primerNombre(perfil?.full_name);

  return (
    <PantallaVacia
      saludo={nombre ? `¡Hola, ${nombre}!` : '¡Hola!'}
      titulo="Tus finanzas personales"
      emoji="bolsa-de-dinero"
      mensaje="Aquí vas a ver tu plata"
      detalle="Pronto podrás anotar tus ingresos y gastos, ponerte topes y crear metas.">
      {/* Mientras no exista la pantalla de Ajustes, cerrar sesión vive aquí. */}
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Boton titulo="Cerrar sesión" variante="texto" onPress={cerrarSesion} />
      </View>
    </PantallaVacia>
  );
}
