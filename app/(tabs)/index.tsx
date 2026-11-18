import { PantallaVacia } from '@/components/PantallaVacia';

export default function PersonalPantalla() {
  return (
    <PantallaVacia
      saludo="¡Hola!"
      titulo="Tus finanzas personales"
      emoji="bolsa-de-dinero"
      mensaje="Aquí vas a ver tu plata"
      detalle="Pronto podrás anotar tus ingresos y gastos, ponerte topes y crear metas."
    />
  );
}
