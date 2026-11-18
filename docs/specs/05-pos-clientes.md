# Especificación 05 · Sirumi POS y clientes

Referencia: `referencia/prototipo/Negocio.dc.html` (pantalla de Vender / Cobrar). Reglas: sección D.

## Entradas al POS
Botón "Sirumi POS" arriba en Negocio y botón grande "Vender".

## 1. Catálogo
- Título "Vender", botón "Ventas" (historial) y escáner.
- **"¿De qué bodega sale lo que vendes?"**: chips de bodegas (si hay más de una). Cambiar de bodega vacía el carrito.
- Botón "Cargar productos y stock" (lleva a Inventario).
- Accesos rápidos (venta libre sin producto, carritos guardados, descuentos…).
- Buscador y colecciones. Tarjetas de producto con foto o emoji, precio y "N disp." de la bodega elegida ("Agotado aquí" si no hay); con varias variantes se escoge la talla o color en una hoja.
- Barra inferior con cantidad de artículos, total y botón para ir a cobrar.

## 2. Cobrar
- Líneas con − y +, descuento (porcentaje, monto o código) con "Editar".
- **Cliente**: "Consumidor final" por defecto; "Cambiar" abre una hoja con buscador (nombre, celular o documento), lista de clientes y "+ Registrar cliente nuevo".
- Registro de cliente nuevo: nombre o razón social*, celular, correo, tipo de documento (Cédula, NIT, Cédula de extranjería, Pasaporte) y número, notas, y la casilla obligatoria "El cliente autoriza guardar sus datos". Botón "Guardar y usar en esta venta".
- **Cómo paga**: chips de formas de pago (D3) + "✏️ Otro": escribir el nombre ("Datáfono Bold", "Wompi", "link de pago"), escoger a qué cuenta llega y "Guardar y usar"; queda guardada para próximas ventas y se puede quitar.
- Dividir el pago en dos (25%, 50% o 75%) con la segunda forma de pago.
- Efectivo: "¿Con cuánto paga?" (Exacto, billetes sugeridos o monto) y vuelto.
- Subtotal, descuento, total y, si es responsable de IVA, base e IVA.
- Botón "Cobrar $ X" (deshabilitado con carrito vacío, fiado sin cliente, u "Otro" sin guardar).

## 3. Venta lista
- Comprobante con número POS-0001, líneas, descuento, total, cliente y forma de pago.
- Compartir por WhatsApp, recibo de regalo (sin precios), nueva venta.
- **Aviso de venta**: sonido de caja registradora (archivo de audio con `expo-audio`), vibración corta y banner verde "¡Venta! $ X" con lo vendido y la forma de pago. Se puede apagar en ajustes.

## 4. Historial de ventas
Lista con número, total, cliente, forma de pago y bodega; detalle con "Devolver" (D4) y reenviar comprobante.

## 5. Clientes
La misma tabla `contacts` de la especificación 03. Los clientes son del negocio: nunca se mezclan entre negocios ni se usan para mercadeo de Sirumi.

## Para la v2
Vendedores con código (solo ven el POS, ventas a su nombre, bodega asignada, clave del dueño para salir), carritos guardados sincronizados, factura electrónica.

## Criterios de aceptación
- Pruebas de D1 a D4: totales con descuento, vuelto, pago dividido, fiado, venta y devolución con stock por bodega.
- Cobrar es una sola transacción en la base de datos (venta + líneas + pagos + movimientos + stock). Si falla, no queda nada a medias.
- Funciona rápido con 200 productos en el catálogo.
