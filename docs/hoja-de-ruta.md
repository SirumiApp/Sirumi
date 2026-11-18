# Hoja de ruta y pensamiento de producto

Sirumi la usan dos tipos de personas. Cada cosa nueva se piensa para las dos.

## ¿Quién la usa y qué le duele?

### 1. La persona que solo quiere llevar sus gastos
Le duele:
- **Anotar todo da pereza.** Si registrar un gasto toma más de 5 segundos, deja de hacerlo. → Registro rápido (+ siempre a mano, voz, conceptos sugeridos), importar el extracto del banco.
- **No sabe cuánto puede gastar hoy.** → "Te quedan $ X, unos $ Y por día" (ya está en Inicio con el plan del mes).
- **Se le olvidan los pagos fijos** (arriendo, servicios, celular, Netflix, la cuota de la moto). → Pagos recurrentes personales con aviso, igual que en el negocio.
- **Las deudas lo agobian.** → Mi plan: deudas con tasa y cuota, cuál pagar primero, cuándo termina.
- **No ve progreso.** → Patrimonio que sube, metas con barra, análisis del mes con lo que mejoró.
- **Le estorba lo que no usa.** Si eligió "solo personal" en el onboarding, Negocio no debería ocupar espacio: se ofrece de forma discreta ("¿Tienes un negocio? Actívalo") y no en el centro de la pantalla.

### 2. El emprendedor (su plata y la del negocio en un solo lugar)
Le duele:
- **No sabe si está ganando plata** porque mezcla la plata de la casa con la del negocio. → Personal / Negocio separados, retiros del dueño como "tu sueldo", utilidad neta clara.
- **Lleva todo en Excel o en un cuaderno.** → Registrar en segundos, POS para vender, inventario que se descuenta solo, informes listos para el contador.
- **Se le pasan las fechas de la DIAN y los pagos del mes.** → Pagos recurrentes (hecho) y **calendario de impuestos** con recordatorios (retención en la fuente, IVA, anticipos del SIMPLE, ICA, renta), según su régimen y el último dígito de su NIT.
- **No sabe cuánto apartar para impuestos.** → "Aparta $ X de cada $ 100.000 que vendes" (hecho en Resultados).
- **Plata dormida en inventario y productos que no rotan.** → Inventario con valor a costo, por reponer y márgenes por producto.
- **Le fían y se le olvida cobrar.** → Lo que te deben por antigüedad (hecho) y recordatorio por WhatsApp al cliente (con su autorización).
- **Pasar los movimientos del banco a mano.** → Importar el extracto.

## Orden de construcción
1. ✅ Base, onboarding, finanzas personales, ajustes, negocio (plata, informes, impuestos estimados, clientes y proveedores, pagos recurrentes), modo ejemplo.
2. **Productos, bodegas e inventario** (módulo 04).
   - 4a: reglas C1–C7 con pruebas, tablas y funciones de stock en la base de datos, bodegas, lista de inventario, nuevo producto con tallas y colores, detalle del producto.
   - 4b: entradas y salidas de mercancía, traslados entre bodegas, escáner de códigos, foto del producto, importar y exportar catálogo.
3. **Sirumi POS** (módulo 05): vender, cobrar, recibo, historial y devoluciones, con el stock por bodega.
4. **Importar extracto del banco** (regla B9) desde el archivo CSV o Excel que descarga el banco, para negocio y personal. Leer el **PDF con IA** queda para la v2.
5. **Calendario de impuestos y obligaciones**: recordatorios según régimen y último dígito del NIT. Las fechas cambian cada año: van en una tabla por año (como las tarifas), y se validan con un contador antes de lanzar.
6. **Pagos recurrentes personales** y modo "solo personal" más limpio.
7. Medición de uso (solo con quien aceptó novedades), términos de servicio, tiendas y prueba con 10 a 20 negocios.

## Ideas para después (v2)
- Leer extractos en PDF con IA, voz para registrar, pronóstico de caja a 13 semanas, vendedores con código, recordatorios de cobro por WhatsApp, factura electrónica.
