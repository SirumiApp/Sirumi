export type Pais = {
  codigo: string;
  bandera: string;
  nombre: string;
  moneda: string;
  prefijo: string;
  /** Separador de miles al mostrar montos. */
  separador: '.' | ',';
  documentos: string[];
};

/** Los 10 países del onboarding. Las banderas sí van como emoji del sistema. */
export const PAISES: Pais[] = [
  { codigo: 'CO', bandera: '🇨🇴', nombre: 'Colombia', moneda: 'COP', prefijo: '+57', separador: '.', documentos: ['Cédula de ciudadanía', 'Cédula de extranjería', 'Pasaporte', 'PPT'] },
  { codigo: 'US', bandera: '🇺🇸', nombre: 'Estados Unidos', moneda: 'USD', prefijo: '+1', separador: ',', documentos: ['ID estatal / licencia', 'Pasaporte'] },
  { codigo: 'MX', bandera: '🇲🇽', nombre: 'México', moneda: 'MXN', prefijo: '+52', separador: ',', documentos: ['CURP', 'INE', 'Pasaporte'] },
  { codigo: 'AR', bandera: '🇦🇷', nombre: 'Argentina', moneda: 'ARS', prefijo: '+54', separador: '.', documentos: ['DNI', 'Pasaporte'] },
  { codigo: 'CL', bandera: '🇨🇱', nombre: 'Chile', moneda: 'CLP', prefijo: '+56', separador: '.', documentos: ['RUT', 'Pasaporte'] },
  { codigo: 'PE', bandera: '🇵🇪', nombre: 'Perú', moneda: 'PEN', prefijo: '+51', separador: ',', documentos: ['DNI', 'Pasaporte'] },
  { codigo: 'EC', bandera: '🇪🇨', nombre: 'Ecuador', moneda: 'USD', prefijo: '+593', separador: ',', documentos: ['Cédula', 'Pasaporte'] },
  { codigo: 'PA', bandera: '🇵🇦', nombre: 'Panamá', moneda: 'USD', prefijo: '+507', separador: ',', documentos: ['Cédula', 'Pasaporte'] },
  { codigo: 'BR', bandera: '🇧🇷', nombre: 'Brasil', moneda: 'BRL', prefijo: '+55', separador: '.', documentos: ['CPF', 'Pasaporte'] },
  { codigo: 'ES', bandera: '🇪🇸', nombre: 'España', moneda: 'EUR', prefijo: '+34', separador: '.', documentos: ['DNI / NIE', 'Pasaporte'] },
];

export function paisPorCodigo(codigo: string): Pais {
  return PAISES.find((p) => p.codigo === codigo) ?? PAISES[0];
}

/** Solo los dígitos de lo que escribió la persona, con separadores del país: 1250000 → "1.250.000". */
export function separarMiles(valor: number, separador: '.' | ','): string {
  return Math.abs(Math.round(valor))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separador);
}

/** "$ 1.250.000" o "$ 1,250,000" según el país. Sin decimales. */
export function formatearMontoPais(valor: number, pais: Pais): string {
  return `${valor < 0 ? '-' : ''}$ ${separarMiles(valor, pais.separador)}`;
}

export function validarCelular(celular: string): string | null {
  return celular.replace(/\D/g, '').length >= 7 ? null : 'Escribe un número de celular válido.';
}
