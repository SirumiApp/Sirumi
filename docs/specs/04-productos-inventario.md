# Especificación 04 · Productos, bodegas e inventario

Referencia: `referencia/prototipo/Negocio.dc.html` (vistas Inventario, Producto, Nuevo producto, Entrada y salida de mercancía, Bodegas). Reglas: sección C.

## 1. Bodegas
- Lista con nombre editable, unidades y valor a costo de cada una.
- Crear con cualquier nombre ("Casa", "Local", "Feria de diciembre"). Una es la **principal** (botón "Hacer principal").
- Quitar solo si está vacía ("Primero mueve sus N unidades a otra bodega"). Siempre debe quedar al menos una.

## 2. Inventario
- Filtro por bodega (Todas o una). Valor a costo, a precio de venta y unidades.
- Lista de productos: unidades (con reparto por bodega cuando se ven todas), variantes, costo unitario, valor, etiqueta "Reponer" si está bajo el mínimo.
- Botones: "+ Nuevo producto", "± Entrada o salida de mercancía", "Importar catálogo" (Excel/CSV con plantilla), "Exportar CSV", "Bodegas".

## 3. Nuevo producto (manual, sin Excel)
- Foto (opcional, se reduce a 240 px), nombre*, colección, precio de venta*, costo por unidad, stock mínimo.
- **Tallas**: chips XS, S, M, L, XL, XXL, 6, 8, 10, 12, 14, 16, 34, 36, 38, 40 y campo para otras.
- **Colores**: campo libre, se agregan como chips que se pueden quitar.
- Se generan las variantes (C7). Por cada una: cantidad inicial con − y + (y escribible) y código de barras (escribir, escanear o "Generar"; botón para generar todos los que falten).
- Bodega donde entra el inventario inicial.
- Validaciones: nombre y precio obligatorios; no guardar con códigos repetidos (C6) y decir con qué producto choca.
- Al guardar se registra un movimiento de inventario "Inventario inicial" por cada variante con cantidad.

## 4. Detalle del producto
- Nombre, foto, colección, costo por unidad con su desglose y margen (C1).
- Variantes: nombre, código de barras (con "Generar" si no tiene y aviso si está repetido), stock de la bodega elegida con − y +, y el reparto por bodega ("Total 42 · Bodega principal 28 · Local 14"). Agregar o quitar variantes.
- "± Registrar entrada o salida" (abre la pantalla 5 con el producto elegido).
- "Mover entre bodegas" (C4): desde, hacia, variante, unidades. No deja mover más de lo que hay.
- Precio y costos editables; punto de equilibrio del producto.

## 5. Entrada y salida de mercancía
- Buscar producto por nombre o escaneando su código (el escaneo deja escogida la variante).
- Variante (muestra unidades en la bodega elegida), bodega, entra o sale, motivo (C3), cantidad con − y +, nota opcional.
- Muestra "Hoy hay X en Bodega · quedarían Y" antes de guardar.
- Lista de últimos movimientos con "Deshacer" (los traslados no se deshacen desde ahí).

## Escáner
Usa la cámara (`expo-camera`) para leer EAN-13 y Code 128 en: nuevo producto, entradas y salidas, y POS.

## Criterios de aceptación
- Pruebas de C2 a C7, incluido el dígito de control EAN-13 y que el stock nunca queda negativo.
- Los cambios de stock se hacen en la base de datos dentro de una transacción (función de Postgres), no sumando en el celular.
