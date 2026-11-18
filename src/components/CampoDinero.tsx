import type { TextInputProps } from 'react-native';

import { separarMiles } from '@/onboarding/paises';

import { CampoTexto } from './CampoTexto';

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  etiqueta: string;
  valor: number;
  onCambio: (valor: number) => void;
  separador?: '.' | ',';
  error?: string | null;
  ayuda?: string;
};

/** Campo para escribir plata: solo acepta números y los muestra con separador de miles. */
export function CampoDinero({ valor, onCambio, separador = '.', ...resto }: Props) {
  return (
    <CampoTexto
      {...resto}
      keyboardType="number-pad"
      placeholder="$ 0"
      value={valor > 0 ? `$ ${separarMiles(valor, separador)}` : ''}
      onChangeText={(texto) => {
        const digitos = texto.replace(/\D/g, '').slice(0, 13);
        onCambio(digitos ? parseInt(digitos, 10) : 0);
      }}
    />
  );
}
