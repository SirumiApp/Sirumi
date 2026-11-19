// D3 · Formas de pago del POS: efectivo, una por cada cuenta o billetera, datáfono (a la cuenta principal),
// las que crea la persona (con su cuenta de destino) y fiado. Función pura.

export type FormaPago = {
  clave: string;
  tipo: 'efectivo' | 'cuenta' | 'datafono' | 'propia' | 'fiado';
  /** Nombre visible; para efectivo, datáfono y fiado lo traduce la pantalla. */
  nombre: string;
  /** Cuenta donde entra la plata; null = fiado (queda por cobrar). */
  cuenta: string | null;
};

export function formasDePago(
  cuentas: { id: string; nombre: string; tipo: 'banco' | 'billetera' | 'efectivo'; principal: boolean }[],
  propias: { id: string; nombre: string; cuenta: string }[],
): FormaPago[] {
  const efectivo = cuentas.find((c) => c.tipo === 'efectivo');
  const principal = cuentas.find((c) => c.principal) ?? efectivo ?? cuentas[0];
  return [
    ...(efectivo ? [{ clave: 'efectivo', tipo: 'efectivo' as const, nombre: efectivo.nombre, cuenta: efectivo.id }] : []),
    ...cuentas.filter((c) => c.tipo !== 'efectivo').map((c) => ({ clave: `cuenta-${c.id}`, tipo: 'cuenta' as const, nombre: c.nombre, cuenta: c.id })),
    ...(principal ? [{ clave: 'datafono', tipo: 'datafono' as const, nombre: 'datafono', cuenta: principal.id }] : []),
    ...propias.map((p) => ({ clave: `propia-${p.id}`, tipo: 'propia' as const, nombre: p.nombre, cuenta: p.cuenta })),
    { clave: 'fiado', tipo: 'fiado', nombre: 'fiado', cuenta: null },
  ];
}
