# Modelo de datos inicial (borrador para Supabase)

Borrador para arrancar; Claude Code lo puede ajustar al implementarlo. Todos los montos en pesos como números enteros (`bigint`). Todas las tablas con `id uuid`, `created_at` y Row Level Security.

## Personas y permisos
- `profiles`: usuario (id = auth.users.id), nombre, celular, país, moneda, preferencias.
- `consents`: autorizaciones del usuario (tipo: términos, datos, IA, novedades), versión de la política, fecha, medio. Nunca se borra una fila: si retira la autorización se agrega otra.
- `businesses`: negocio (nombre, tipo, régimen tributario, NIT opcional, ciudad).
- `business_members`: usuario + negocio + rol (`owner`, `seller`; en v2 `accountant`). Las políticas RLS del negocio miran esta tabla.

## Plata
- `accounts`: cuentas de banco, billeteras y efectivo, de una persona o de un negocio (`owner_type` personal o negocio). Nombre libre, tipo, saldo inicial.
- `credit_cards`: tarjetas de crédito (nombre, cupo, deuda inicial).
- `movements`: movimientos (fecha, tipo, concepto, monto, cuenta o tarjeta, pagado o pendiente, contacto, notas, origen: manual, POS, importación, extracto).
- `transfers`: plata movida entre cuentas propias o pagos a tarjetas.
- Personal: `budgets` (topes por categoría), `goals` (metas de ahorro), `debts`.

## Productos e inventario
- `warehouses`: bodegas del negocio (nombre libre, una marcada como principal).
- `products`: nombre, colección, foto, precio, costos (materia prima, mano de obra, empaque, otros), stock mínimo.
- `variants`: talla, color, nombre visible ("Negro / M"), código de barras (único por negocio).
- `stock`: variante + bodega + cantidad. Es la cantidad actual; se cambia solo a través de movimientos de inventario.
- `stock_moves`: cada entrada o salida (variante, bodega, cantidad con signo, motivo, nota, quién, venta relacionada). Los traslados entre bodegas son dos filas enlazadas.

## Ventas y clientes
- `contacts`: clientes y proveedores **del negocio** (nombre o razón social, tipo y número de documento, celular, correo, dirección, ciudad, notas, autorizó guardar sus datos y cuándo).
- `sales`: venta del POS (número consecutivo por negocio, fecha, cliente, bodega, vendedor, subtotal, descuento, total, estado: pagada, fiada, devuelta).
- `sale_items`: líneas de la venta (variante, cantidad, precio).
- `sale_payments`: formas de pago de la venta (efectivo, cuenta, datáfono, otra forma escrita por el usuario) y a qué cuenta llegó la plata.
- `payment_methods`: formas de pago que el negocio crea (por ejemplo "Datáfono Bold") con su cuenta de destino.

## Growth (solo con autorización)
- `events`: eventos de uso de la app (pantalla vista, venta registrada, producto creado…) sin montos ni datos de clientes. Se pueden enviar después a una herramienta de analítica.

## Reglas
- Una venta, su descuento de stock y sus movimientos de plata se guardan juntos (una sola transacción en la base de datos), para que nunca quede una venta sin stock descontado ni al revés.
- El stock nunca queda negativo.
- Los contactos de un negocio solo los ven sus miembros.
