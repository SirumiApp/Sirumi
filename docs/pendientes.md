# Pendientes

Lista viva de lo que falta o hay que volver a revisar. Se actualiza al terminar cada módulo.

## Ajustes (volver a revisar con Nicolás)
Comparado con los ajustes de los prototipos (`referencia/prototipo/Main.dc.html` y el prototipo nuevo de nov 2026):
- [x] **Período por defecto**: decidido con Nicolás (nov 2026): el mes va siempre del 1 al último día, en personal y en negocio. No se agrega el ajuste.
- [x] **Notificaciones**: aviso de cada venta al dueño (servidor → Expo) y recordatorios de pagos recurrentes (en el celular). En Expo Go para iPhone llegan; en Android hace falta la app instalada.
- [ ] Más avisos: topes, resumen semanal, calendario de impuestos, "sube tus extractos".
- [x] **Términos de servicio**: en la app (borrador 2), falta revisión legal.
- [ ] **Importar CSV** (desde un CSV exportado de la app).
- [ ] **¿Te gusta la app? Déjanos una reseña**: cuando esté en las tiendas.
- [ ] **Sugerencias** (votar funciones).
- [ ] **Premium**: falta decidir si habrá plan pago y su precio.
- [ ] **Lista de recurrentes** y **etiquetas**: no están en el alcance de la v1; decidir si entran.
- Fuera de la v1 según la especificación: listas compartidas, WhatsApp, rastreo automático con mensajes del banco, conversión de monedas, mejoras con IA, idioma de voz y registro instantáneo.

## Negocio (siguientes partes del módulo 03)
- [x] Mover plata entre cuentas y pagar tarjetas, con historial (Caja).
- [x] Informes hechos: estado de resultados + de cada $100, impuestos (B7) y equilibrio (Resultados); flujo de caja (Caja); balance, cartera por antigüedad, dueño y capital, entradas y salidas (Más). Todos se comparten como texto.
- [ ] Informes que esperan otros módulos: ventas por producto/cliente, inventario y márgenes (módulo 04), cierre del día (POS, módulo 05). Exportar a PDF.
- [x] Impuestos estimados (B7) en la utilidad neta del Resumen (tabla `tax_parameters` por año).
- [x] Clientes y proveedores (ficha, autorización Ley 1581, estadísticas) y contacto en los movimientos.
- [x] Pagos recurrentes con aviso dentro de la app (Resumen) y "Registrar pago".
- [x] Notificación en el celular para los pagos recurrentes.
- [x] Inventario a costo en el arranque y en el balance (sale de los productos).
- [x] Sirumi POS (módulo 05): catálogo por bodega, venta libre, escáner, carrito, descuento (% o monto), cliente con registro y autorización, formas de pago (efectivo, cuentas, datáfono, propias, fiado), pago dividido, vuelto, cobro en una sola transacción, comprobante por WhatsApp, recibo de regalo, historial, devoluciones, sonido y vibración, costo real en Resultados y cierre del día.

## POS (lo que falta)
- [x] Códigos de descuento (crear y usar).
- [ ] Carritos guardados (atender a otro cliente y volver).
- [x] Código de barras en todas partes (Shopify POS): escribir, generar, escanear con la cámara o con pistola lectora; en el POS la cámara queda abierta y suma un producto tras otro.
- [x] IVA en el POS (D6): incluido en el precio por defecto, con opción de sumarlo; las ventas cuentan sin IVA y el IVA cobrado se muestra aparte.
- [ ] IVA por producto (exentos o con otra tarifa, como 5%) y "IVA por pagar" en el balance.
- [ ] Imprimir etiquetas de código de barras (PDF para impresora de etiquetas) e impresora de recibos Bluetooth.
- [x] Vendedores con código (adelantado de la v2): el dueño crea códigos; el vendedor entra desde el onboarding o Ajustes y solo ve el POS de su bodega y sus ventas.
- [x] Informe de ventas por producto, vendedor, forma de pago y cliente.

## Inventario (módulo 04)
- [x] 4a: reglas C1–C7 con pruebas; tablas y funciones de stock (nunca negativo, todo queda registrado); bodegas; lista de inventario; nuevo producto con tallas, colores, cantidades y códigos; detalle con stock por bodega, ajuste de conteo, variantes, editar y deshacer.
- [x] 4b: entrada y salida de mercancía (motivo, "quedarían Y", deshacer), mover entre bodegas desde el producto, escáner con la cámara (EAN-13, Code 128…), foto del producto (240 px, bucket privado por negocio), importar y exportar catálogo CSV (regla C8).
- [ ] Importar desde Excel (.xlsx) directamente; hoy se guarda como CSV desde Excel.

## Ideas de Nicolás (nov 2026) — ver docs/hoja-de-ruta.md
- [x] Importar extracto del banco (CSV/Excel, regla B9) para negocio y personal, con deshacer. Falta: extractos de tarjetas de crédito; PDF con IA en la v2.
- [x] Calendario de impuestos y retenciones con recordatorios (según régimen y último dígito del NIT; fechas por año en una tabla, validar con contador).
- [x] Pagos recurrentes personales y modo "solo personal" más limpio.

## Modo ejemplo
- [x] Ajustes → "Ver la app con un ejemplo" y botón "Ver un ejemplo primero" cuando la cuenta está vacía. Datos inventados en `src/ejemplo/` (no tocan la base de datos; guardar está bloqueado con aviso).
- [x] Cuando existan productos, inventario y POS: sumarles datos de ejemplo.

## Lo que sigue (pedido de Nicolás, nov 2026)
- [x] Códigos de descuento (D7) e informe de ventas (D8): más vendidos con ganancia, vendedores, formas de pago, clientes.
- [x] Importar extractos (CSV/Excel) por cuenta y mes, en negocio y personal (B9).
- [x] Calendario de impuestos y retenciones con avisos, y aviso mensual "sube tus extractos".
- [x] Pagos recurrentes personales con avisos.
- [ ] Factura electrónica DIAN (después): conectar con un proveedor tecnológico autorizado.

## Producción
- [ ] Proyecto de Supabase de producción en us-east-1 (el actual `sirumi-dev` está en us-east-2).
- [ ] Servicio de correo propio (SMTP) y volver a activar la confirmación de correo con código.
- [ ] Revisión legal de las políticas en español e inglés.
- [ ] Micrófono propio para dictar (requiere la app instalada).

## Revisión de errores (19 nov 2026)
- [x] El servidor entrega máximo 1.000 filas por consulta: movimientos, traslados, contactos, productos, stock, ventas y exportar ahora se piden por páginas (antes los saldos saldrían mal en negocios con mucho movimiento).
- [x] Ventas del POS: se cargan desde el 1 de enero del año pasado (antes, solo las últimas 500).
- [x] Guardar la configuración del negocio ya no pisa un cambio hecho en otra pantalla o dos toques seguidos.
- [x] Modo ejemplo: editar una venta del POS ya no la desliga de su venta; se puede devolver una venta.
- [x] Fechas del historial de inventario con el formato de la app ("15 nov") y la hora de Colombia.

## Mejoras propuestas (por decidir)
- [x] POS sin internet (ferias): vender sin señal y sincronizar al volver (D9).
- [x] Arqueo de caja al cerrar el día (D10).
- [ ] Aviso de inventario bajo el mínimo y de topes personales al 80%.
- [x] Devolución parcial (D4b).
- [ ] IVA por producto (exento, 5%) e "IVA por pagar" en el balance.
- [ ] Resumen semanal por notificación ("esta semana vendiste $ X, gastaste $ Y").
