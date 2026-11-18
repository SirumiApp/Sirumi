# Pendientes

Lista viva de lo que falta o hay que volver a revisar. Se actualiza al terminar cada módulo.

## Ajustes (volver a revisar con Nicolás)
Comparado con los ajustes de los prototipos (`referencia/prototipo/Main.dc.html` y el prototipo nuevo de nov 2026):
- [x] **Período por defecto**: decidido con Nicolás (nov 2026): el mes va siempre del 1 al último día, en personal y en negocio. No se agrega el ajuste.
- [ ] **Notificaciones** (permitir, alertas de topes, resumen semanal/mensual, alerta de ritmo): requieren la app instalada (no funcionan en Expo Go).
- [ ] **Términos de servicio**: falta el texto (Fase 3, paso 11).
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
- [ ] Notificación en el celular para los pagos recurrentes (requiere la app instalada).
- [x] Inventario a costo en el arranque y en el balance (sale de los productos).
- [ ] Sirumi POS (módulo 05).

## Inventario (módulo 04)
- [x] 4a: reglas C1–C7 con pruebas; tablas y funciones de stock (nunca negativo, todo queda registrado); bodegas; lista de inventario; nuevo producto con tallas, colores, cantidades y códigos; detalle con stock por bodega, ajuste de conteo, variantes, editar y deshacer.
- [ ] 4b: pantalla de entrada y salida de mercancía (con motivo y "quedarían Y"), mover entre bodegas desde el producto, escáner de códigos con la cámara, foto del producto, importar y exportar catálogo (CSV).

## Ideas de Nicolás (nov 2026) — ver docs/hoja-de-ruta.md
- [ ] Importar extracto del banco (CSV/Excel, regla B9) para negocio y personal. PDF con IA en la v2.
- [ ] Calendario de impuestos y retenciones con recordatorios (según régimen y último dígito del NIT; fechas por año en una tabla, validar con contador).
- [ ] Pagos recurrentes personales y modo "solo personal" más limpio.

## Modo ejemplo
- [x] Ajustes → "Ver la app con un ejemplo" y botón "Ver un ejemplo primero" cuando la cuenta está vacía. Datos inventados en `src/ejemplo/` (no tocan la base de datos; guardar está bloqueado con aviso).
- [ ] Cuando existan productos, inventario y POS: sumarles datos de ejemplo.

## Producción
- [ ] Proyecto de Supabase de producción en us-east-1 (el actual `sirumi-dev` está en us-east-2).
- [ ] Servicio de correo propio (SMTP) y volver a activar la confirmación de correo con código.
- [ ] Revisión legal de las políticas en español e inglés.
- [ ] Micrófono propio para dictar (requiere la app instalada).
