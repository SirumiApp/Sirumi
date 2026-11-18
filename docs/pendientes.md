# Pendientes

Lista viva de lo que falta o hay que volver a revisar. Se actualiza al terminar cada módulo.

## Ajustes (volver a revisar con Nicolás)
Comparado con los ajustes de los prototipos (`referencia/prototipo/Main.dc.html` y el prototipo nuevo de nov 2026):
- [ ] **Período por defecto**: mensual, quincenal, semanal o anual, y día en que empieza el mes (1–28). Antes de construirlo hay que escribir la regla en `docs/reglas-de-calculo.md` (cambia "Este mes", topes y plan).
- [ ] **Notificaciones** (permitir, alertas de topes, resumen semanal/mensual, alerta de ritmo): requieren la app instalada (no funcionan en Expo Go).
- [ ] **Términos de servicio**: falta el texto (Fase 3, paso 11).
- [ ] **Importar CSV** (desde un CSV exportado de la app).
- [ ] **¿Te gusta la app? Déjanos una reseña**: cuando esté en las tiendas.
- [ ] **Sugerencias** (votar funciones).
- [ ] **Premium**: falta decidir si habrá plan pago y su precio.
- [ ] **Lista de recurrentes** y **etiquetas**: no están en el alcance de la v1; decidir si entran.
- Fuera de la v1 según la especificación: listas compartidas, WhatsApp, rastreo automático con mensajes del banco, conversión de monedas, mejoras con IA, idioma de voz y registro instantáneo.

## Negocio (siguientes partes del módulo 03)
- [ ] Mover plata entre cuentas y pagar tarjetas (la tabla de traslados ya existe), con historial.
- [ ] Informes: estado de resultados, flujo de caja, entradas y salidas, costos y equilibrio, ventas, cartera, inventario, impuestos (B7, tabla por año), cierre del día, dueño y capital, balance.
- [ ] Impuestos estimados (B7) en la utilidad neta del Resumen (hoy se muestra antes de impuestos).
- [ ] Clientes y proveedores (ficha y estadísticas) y contacto en los movimientos.
- [ ] Pagos recurrentes con recordatorio.
- [ ] Inventario a costo en el arranque (cuando existan productos).
- [ ] Sirumi POS (módulo 05) e inventario (módulo 04).

## Producción
- [ ] Proyecto de Supabase de producción en us-east-1 (el actual `sirumi-dev` está en us-east-2).
- [ ] Servicio de correo propio (SMTP) y volver a activar la confirmación de correo con código.
- [ ] Revisión legal de las políticas en español e inglés.
- [ ] Micrófono propio para dictar (requiere la app instalada).
