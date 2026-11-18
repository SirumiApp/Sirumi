# Especificación 03 · Negocio

Referencia: `referencia/prototipo/Negocio.dc.html` (pestañas Inicio, Movimientos, Informes y Más). Reglas: `docs/reglas-de-calculo.md`, sección B.

## 1. Arranque del negocio
Formulario por secciones; todo es opcional.
- **Lo que tienes**: una fila por cuenta con **nombre libre** (Davivienda, Nequi, Daviplata…) y saldo de hoy; botón "+ Agregar otra cuenta o billetera"; "Efectivo" siempre existe y no se puede quitar. Ícono automático: 📱 si el nombre parece billetera (Nequi, Daviplata, Movii, Dale, Lulo, Nu, Rappi, Ualá, Mercado Pago, Bold); 🏦 si no. Además: inventario a costo (se calcula solo si hay productos), lo que te deben los clientes, equipos y herramientas.
- **Lo que debes**: deudas con proveedores, préstamos (bancos, cooperativas, familiares) y **tarjetas de crédito**: nombre, cupo total y deuda de hoy; muestra el cupo disponible y avisa si la deuda supera el cupo.
- **Tu operación normal**: ventas de un mes típico, gastos fijos al mes, costo del producto como % de la venta, régimen tributario (SIMPLE, Ordinario, Persona natural) y grupo de actividad.
- Resumen: lo que tienes, lo que debes y patrimonio.
- Si al guardar se quita una cuenta que tenía movimientos, esos movimientos pasan a la cuenta principal y se avisa.

## 2. Inicio
- Caja total (B4), lo que te deben, lo que debes, y proyección (caja + por cobrar − por pagar).
- Ventas, utilidad y margen del período con comparación.
- Botón "Sirumi POS" arriba y botón grande "Vender".
- Salud del negocio (puntaje 0 a 100): utilidad neta positiva, meses de caja (caja / gastos mensuales), avance hacia el punto de equilibrio.

## 3. Movimientos
- Registrar: tipo (B1) con su explicación corta, conceptos sugeridos por tipo, monto, fecha, cuenta o tarjeta (las tarjetas solo para salidas), contacto opcional, pagado o pendiente.
- Lista filtrable por tipo y período. Editar y borrar.
- Pendientes: marcar como cobrado o pagado (elige la cuenta).
- Pagos recurrentes (arriendo, nómina…) con recordatorio.

## 4. Cuentas y saldos
- Lista de cuentas con saldo (B2) y total.
- Tarjetas de crédito: deuda, cupo, disponible y barra de uso (roja desde el 80%).
- "Mover plata o pagar una tarjeta": desde, hacia (cuentas o tarjetas), monto. Historial de transferencias.

## 5. Informes
Cada informe con selector de período, cifras principales arriba, filas explicadas en lenguaje simple y botón para compartir o exportar:
1. Estado de resultados (B5) + "De cada $100 que vendes".
2. Flujo de caja (B6).
3. Entradas y salidas.
4. Cuadro de costos y punto de equilibrio (C1, B8).
5. Ventas (por producto, por cuenta, por cliente).
6. Cartera: por cobrar y por pagar, con antigüedad.
7. Inventario y márgenes (C5, por bodega).
8. Impuestos estimados (B7): comparación de regímenes, cuánto apartar de cada venta y aviso del tope de 3.500 UVT.
9. Cierre del día (POS): ventas del día por forma de pago y por cuenta.
10. Dueño y capital: aportes, retiros, utilidad.
11. Balance y patrimonio: lo que tienes (cuentas, por cobrar, inventario, equipos) y lo que debes (por pagar, préstamos, cada tarjeta).

## 6. Clientes y proveedores
Ficha: nombre o razón social, tipo (cliente o proveedor), tipo y número de documento (cédula, NIT, cédula de extranjería, pasaporte), celular, correo, dirección, ciudad, notas, autorización de datos. Estadísticas: cuánto ha comprado, cuánto debe.

## Fuera de la v1
Cerebro con IA (leer Excel del negocio), extractos del banco en PDF, voz, pronóstico de caja a 13 semanas, vendedores con código.

## Criterios de aceptación
- Todas las reglas de la sección B con pruebas, incluidos los ejemplos de tarjeta de crédito (B3) y de flujo de caja (B6: el saldo al cierre coincide con la caja).
- Ningún texto dice "Bancolombia" o "Nequi" fijo: las cuentas siempre son las del usuario.
