# Plan de construcción de Sirumi (v1)

Tecnología: React Native con Expo + TypeScript (iPhone y Android con un solo código) y Supabase en la región East US (us-east-1).

## Fase 1 · La base
1. Proyecto Expo con TypeScript, Expo Router, linter y pruebas. Estructura de carpetas clara (`app/` pantallas, `src/components`, `src/lib` cálculos y cliente de Supabase, `src/theme` marca, `supabase/migrations` base de datos).
2. Tema de marca: colores, Sora e Inter, modo claro y oscuro, componente `<Emoji name="..." />` que muestra los PNG 3D de `assets/emojis/`.
3. Navegación con las pestañas del prototipo (Personal y Negocio) y pantallas vacías con la marca. Probar en el celular con Expo Go.
4. Conectar Supabase: registro e inicio de sesión con correo, tablas base y Row Level Security.

## Fase 2 · Módulos (en este orden)
5. Onboarding: país, moneda, para qué usará la app (personal, negocio o las dos), metas, y la política de privacidad con sus casillas (el texto está en `referencia/prototipo/Onboarding.dc.html`). Guardar cada autorización en `consents`.
6. Finanzas personales: movimientos, topes por categoría, metas, deudas y resumen del mes.
7. Negocio: arranque (cuentas con nombre libre, tarjetas de crédito, préstamos), movimientos, cuentas y saldos, informes (estado de resultados, flujo de caja, balance).
8. Productos e inventario: nuevo producto con tallas, colores y códigos de barras; bodegas; entradas y salidas de mercancía; traslados entre bodegas.
9. Sirumi POS: catálogo por bodega, carrito, descuentos, cliente (registro con autorización), formas de pago (incluidas las que escribe el usuario), cobro, recibo, historial y devoluciones; aviso y sonido de venta.
10. Medición de uso para growth (solo con quien aceptó novedades).

## Fase 3 · Lanzamiento
11. Términos y Condiciones y página web con la política de privacidad.
12. Ícono, pantalla de inicio, capturas y textos para las tiendas.
13. Prueba cerrada con 10 a 20 negocios (TestFlight y prueba interna de Google Play).
14. Corregir y publicar.

## Para la v2
Vendedores con código y sincronización entre celulares, extractos del banco en PDF con IA, voz, pronóstico de caja, CRM por negocio.
