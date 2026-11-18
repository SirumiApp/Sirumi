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
- [ ] Clientes y proveedores (ficha y estadísticas) y contacto en los movimientos.
- [ ] Pagos recurrentes con recordatorio.
- [ ] Inventario a costo en el arranque (cuando existan productos).
- [ ] Sirumi POS (módulo 05) e inventario (módulo 04).

## Modo ejemplo
- [x] Ajustes → "Ver la app con un ejemplo" y botón "Ver un ejemplo primero" cuando la cuenta está vacía. Datos inventados en `src/ejemplo/` (no tocan la base de datos; guardar está bloqueado con aviso).
- [ ] Cuando existan productos, inventario y POS: sumarles datos de ejemplo.

## Producción
- [ ] Proyecto de Supabase de producción en us-east-1 (el actual `sirumi-dev` está en us-east-2).
- [ ] Servicio de correo propio (SMTP) y volver a activar la confirmación de correo con código.
- [ ] Revisión legal de las políticas en español e inglés.
- [ ] Micrófono propio para dictar (requiere la app instalada).
