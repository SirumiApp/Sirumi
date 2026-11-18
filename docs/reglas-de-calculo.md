# Reglas de cálculo de Sirumi

Fuente de verdad para todos los cálculos de dinero y stock. Cada regla trae un ejemplo con números: **convierte cada ejemplo en una prueba automática** (por ejemplo con Jest) antes de construir la pantalla que la usa. Si una regla y el prototipo no coinciden, manda este documento.

Convenciones:
- Montos en pesos, números enteros. Redondeo al peso más cercano solo al mostrar o al guardar un resultado final, nunca en pasos intermedios.
- Fechas en formato `AAAA-MM-DD`. "Hoy" viene del celular, en la zona horaria America/Bogota.
- "Período" = rango de fechas elegido por el usuario (por defecto, el mes actual hasta hoy).

---

## A. Finanzas personales

### A1. Gastos e ingresos del período
- Gasto del período = suma de movimientos tipo `gasto` con fecha dentro del período. Ingreso = suma de tipo `ingreso`.
- Por categoría: lo mismo filtrando por categoría.
- Ejemplo: gastos de noviembre 1.200.000 (comida) + 600.000 (mercado) → gasto total 1.800.000.

### A2. Comparación con el período anterior
- Si el período es un mes completo (o el mes actual hasta hoy), el período anterior es el **mes calendario anterior completo**. Si es un rango libre de N días, es el rango de N días inmediatamente anterior.
- Variación % = redondear((actual − anterior) / anterior × 100). Si el anterior es 0, no se muestra porcentaje ("Sin gastos en octubre").
- Ejemplo: noviembre 1.800.000, octubre 2.000.000 → −10%.

### A3. Topes por categoría
- Tope del período = tope mensual × número de meses del período. Para un mes: el tope tal cual. Para un rango libre: meses = redondear(días / 30,44, 1 decimal), mínimo 1.
- Uso = gastado / tope. Estados:
  - "Superado" si uso > 100%.
  - "Cuidado" si la alerta está activa y uso ≥ umbral (por defecto 80%) y no está superado.
  - Si no, se muestra el porcentaje. Categoría sin tope: "Sin tope".
- Ejemplo: tope comida 1.200.000, gastado 1.000.000 → 83% → "Cuidado". Gastado 1.300.000 → "Superado".

### A4. Plan del mes (viene del onboarding)
- Disponible para gastar = ingreso mensual − monto a separar (ahorro, abono a deudas o cuota de la meta).
- Le queda = disponible − gastado del período. Por día (solo en el mes actual) = le queda / (días del mes − día de hoy + 1).
- Estados: "Te pasaste" si le queda < 0; "Cuidado" si gastado ≥ 80% del disponible; si no, "Vas bien".
- Ejemplo: ingreso 6.000.000, ahorro 2.000.000 → disponible 4.000.000. Día 15 de un mes de 30, gastado 1.800.000 → le quedan 2.200.000 → 137.500 por día (2.200.000 / 16).

### A5. Meta con fecha
- Cuota mensual = techo(monto de la meta / meses). Ejemplo: 4.000.000 en 8 meses → 500.000 al mes.
- El plan es válido solo si 0 < cuota < ingreso.
- Progreso de una meta = mín(100, redondear(ahorrado / objetivo × 100)). Abonar nunca supera el objetivo.

### A6. Deudas
- Tasa mensual equivalente = (1 + tasa EA)^(1/12) − 1. Intereses del mes ≈ saldo × tasa mensual.
- Ejemplo: tarjeta con saldo 2.400.000 al 28% EA → tasa mensual 2,078% → unos 49.883 de intereses al mes.
- Prioridad sugerida: la deuda con saldo > 0 y **mayor tasa** (método avalancha). Abonar nunca deja el saldo negativo.
- Total de deudas = suma de saldos. Intereses del mes en total = suma de los intereses de cada deuda (sin redondear en el camino).

### A7. Patrimonio personal
- Patrimonio = activos (cuentas, inversiones, bienes) + ahorrado en metas − deudas.
- Evolución: se guarda una foto del patrimonio por mes (la última del mes vale). La gráfica muestra los últimos 6 meses; un mes sin foto repite el valor del mes anterior, y los meses antes de la primera foto quedan vacíos.
- Ejemplo: activos 15.200.000 (cuentas 3.200.000 + inversiones 5.000.000 + moto 7.000.000), metas 7.500.000, deudas 10.900.000 → patrimonio 11.800.000.

### A8. Análisis del mes
- Proyección de cierre = gastado / día de hoy × días del mes.
- Tasa de ahorro = redondear((ingresos − gastos) / ingresos × 100). Meta sugerida: ≥ 20%.
- Gustos (shopping + comida fuera + salidas) / ingresos: la regla 50/30/20 sugiere ≤ 30%.
- Gastos hormiga: gastos menores de 25.000 en el período; se avisa si hay 3 o más.
- Ritmo del mes: si la proyección de cierre supera el gasto total del mes anterior, se avisa ("A este ritmo cerrarías en …"); si no, "Vas a buen ritmo". Sin gastos el mes anterior no se compara.
- Shopping: se avisa si el gasto en Shopping del mes supera el 10% de los ingresos del mes.
- Topes superados: se avisa cuántas categorías tienen estado "Superado" (A3) en el mes.
- Comparación por categoría: gasto del mes contra el del mes anterior completo, con la variación de A2 (sin porcentaje si el mes anterior fue 0).
- Gráfica: gastos e ingresos de cada uno de los últimos 6 meses (el actual hasta hoy).
- Los consejos que dependen de ingresos (tasa de ahorro, 50/30/20, shopping) no se muestran si el mes no tiene ingresos.

---

## B. Negocio: plata

### B1. Tipos de movimiento
| Tipo | Entra o sale | ¿Cuenta en el estado de resultados? |
|---|---|---|
| Venta | Entra | Sí (ventas) |
| Compra de producto | Sale | No: va al inventario (se vuelve costo cuando se vende) |
| Gasto fijo | Sale | Sí |
| Gasto variable | Sale | Sí |
| Inversión | Sale | No (es un activo) |
| Aporte de socios | Entra | No |
| Préstamo | Entra | No |
| Retiro del dueño | Sale | No (no es gasto del negocio) |
| Impuestos | Sale | Se muestra aparte |
- Un movimiento puede estar **pagado** o **pendiente** (solo venta, compra, fijo, variable e inversión pueden quedar pendientes). Ventas pendientes = "por cobrar"; el resto pendiente = "por pagar".

### B2. Saldo de una cuenta (banco, billetera o efectivo)
- Saldo = saldo inicial + entradas pagadas a esa cuenta − salidas pagadas desde esa cuenta + transferencias recibidas − transferencias enviadas.
- Los movimientos pendientes no mueven saldos.
- Ejemplo: Davivienda inicia en 3.000.000; venta pagada de 500.000 → 3.500.000; arriendo pagado de 1.300.000 → 2.200.000; transfiere 200.000 a Efectivo → 2.000.000.

### B3. Tarjetas de crédito
- Deuda de la tarjeta = deuda inicial + compras pagadas con la tarjeta − pagos hechos a la tarjeta (transferencias desde una cuenta).
- Una compra con tarjeta **es gasto** en el estado de resultados, pero **no baja la caja** hasta que se paga la tarjeta.
- Pagar la tarjeta baja el saldo de la cuenta de origen y baja la deuda; no es un gasto nuevo.
- Cupo disponible = cupo − deuda. Avisar cuando la deuda supera el 80% del cupo, y si supera el cupo.
- Ejemplo: caja 3.000.000, tarjeta con cupo 5.000.000 y deuda 1.200.000. Gasto de publicidad de 300.000 con la tarjeta → caja sigue en 3.000.000, deuda 1.500.000, disponible 3.500.000, y el gasto variable del mes sube 300.000. Luego paga 500.000 desde Davivienda → caja 2.500.000, deuda 1.000.000.
- Una venta nunca se registra "con tarjeta de crédito del negocio"; si alguien elige una tarjeta como destino de una venta, se guarda en la cuenta principal.

### B4. Caja total
- Caja = suma de saldos de todas las cuentas (B2). Equivale a: saldos iniciales + entradas pagadas − salidas pagadas que no fueron con tarjeta − pagos a tarjetas.

### B5. Estado de resultados (período)
- Ventas = suma de ventas del período (cobradas o no).
- Costo de ventas = **suma del costo unitario × unidades vendidas** de los productos vendidos en el período. Para ventas manuales sin productos, usar el % de costo configurado del negocio. (El prototipo usaba solo el % promedio; la app real debe usar el costo real.)
- Utilidad bruta = ventas − costo de ventas. Margen bruto = utilidad bruta / ventas.
- Utilidad operativa = utilidad bruta − gastos fijos − gastos variables.
- Utilidad neta = utilidad operativa − impuestos estimados (B7).
- Ejemplo (con 45% de costo): ventas 10.000.000 → costo 4.500.000 → bruta 5.500.000; fijos 3.200.000 y variables 1.000.000 → operativa 1.300.000; SIMPLE estimado 160.000 → neta 1.140.000.
- "De cada $100 que vendes": costo, fijos, variables, impuestos y lo que queda, como porcentaje de las ventas.

### B6. Flujo de caja (período)
- Solo cuenta lo que realmente se cobró o pagó, y excluye las compras con tarjeta.
- Operación = ventas cobradas − compras pagadas − fijos pagados − variables pagados − impuestos pagados.
- Inversión = − inversiones pagadas.
- Financiación = aportes + préstamos − retiros del dueño − pagos a tarjetas.
- Saldo al cierre = caja al inicio del período + operación + inversión + financiación. Debe coincidir con la caja de B4 cuando el período termina hoy.

### B7. Impuestos estimados (orientativos, no reemplazan al contador)
- **Las tarifas y la UVT cambian cada año: guárdalas en una tabla por año**, nunca fijas en el código. Valores usados en el prototipo para 2026 (validar con el contador antes de lanzar): UVT = 52.374; tope de 3.500 UVT para IVA y facturación.
- **SIMPLE**: ventas × tarifa. La tarifa depende del grupo de actividad y de los ingresos del bimestre en UVT (ingresos del bimestre = ventas del período llevadas a 60 días). Rangos por bimestre: < 1.000 UVT, < 2.500, < 5.000, ≥ 5.000.
  - Grupo 1 (tienda, minimercado, peluquería): 1,2% · 2,8% · 4,4% · 5,6%.
  - Grupo 2 (comercio, industria, servicios técnicos): 1,6% · 2,0% · 3,5% · 4,5%.
  - Grupo 3 (profesionales y consultores): 7,3% · 8,3% · 8,3% · 8,3%.
  - Grupo 4 (restaurantes y transporte): 3,1% · 3,4% · 4,0% · 4,5%.
  - Ejemplo: ventas de 10.000.000 en 30 días → 381,9 UVT por bimestre → primer rango → grupo 2 → 1,6% → 160.000. El SIMPLE incluye el ICA.
- **Ordinario (SAS)**: 35% de la utilidad operativa (si es positiva) + ICA.
- **Persona natural**: tabla del artículo 241 aplicada a la utilidad anualizada en UVT, devuelta al período + ICA.
- **ICA**: ventas × tarifa por mil del municipio (prototipo: 9,66 por mil → 10.000.000 × 9,66/1000 = 96.600).
- Comparar los tres regímenes y marcar el más bajo.
- Si las ventas anualizadas superan 3.500 UVT, avisar que pasaría a ser responsable de IVA y a facturar electrónicamente.
- Si el negocio es responsable de IVA, la venta del POS se registra por su base: total / 1,19 (119.000 → 100.000).

### B8. Punto de equilibrio
- Margen de contribución = 1 − % de costo − (gastos variables / ventas). Sin ventas: 1 − % de costo.
- Ventas de equilibrio = gastos fijos del mes / margen de contribución. Si el margen ≤ 0: "Con tus costos actuales no alcanzas equilibrio: revisa tu precio".
- Ejemplo: fijos 3.200.000, costo 45%, variables 10% de las ventas → margen 45% → equilibrio 7.111.111 al mes.
- Unidades de equilibrio de un producto = techo(equilibrio / precio).

### B8b. Lo que te deben, lo que debes y proyección
- Por cobrar = suma de ventas pendientes + lo que los clientes debían al arrancar. Por pagar = suma de los demás movimientos pendientes (compras, fijos, variables, inversión) + deudas iniciales con proveedores y préstamos del arranque.
- Proyección = caja (B4) + por cobrar − por pagar.
- Meses de caja = caja / gastos del mes. Gastos del mes = gastos fijos de la operación normal (si no los escribió, los fijos registrados en el período) + gastos variables registrados en el período. Sin gastos no se calcula.

### B8c. Salud del negocio (0 a 100, del prototipo)
- +30 si la utilidad neta > 0; si no, +12 si la utilidad operativa > 0.
- +25 si alcanza para 3 meses de gastos o más; +12 si alcanza para 1 mes o más.
- Hasta +20 según el avance hacia el punto de equilibrio: redondear(ventas / equilibrio × 20), máximo 20 (0 si no hay equilibrio).
- +10 si lo que te deben es como mucho el 25% de las ventas del período (o no hay ventas); si es más, +4.
- +15 si los retiros del dueño no superan la utilidad operativa (o 0 si es negativa).
- Máximo 100. "Saludable" desde 75, "Con atención" desde 50, "En riesgo" por debajo.
- Ejemplo: neta 1.140.000 (>0 → 30), 3,2 meses de caja (→ 25), ventas 10.000.000 con equilibrio 7.111.111 (→ 20), por cobrar 1.000.000 = 10% (→ 10), retiros 800.000 ≤ operativa 1.300.000 (→ 15) → 100 "Saludable".

### B8d. Ícono de una cuenta
- 📱 billetera si el nombre contiene Nequi, Daviplata, Movii, Dale, Lulo, Nu, Rappi, Ualá, Mercado Pago o Bold (sin importar mayúsculas ni tildes); "Efectivo" usa 💵; las demás 🏦.

### B9. Importar un extracto del banco
- Cada fila trae fecha, descripción y valor con signo (o columnas de débito y crédito). Positivo = entrada; negativo = salida.
- Una fila es **duplicada** si ya existe un movimiento con la misma fecha y el mismo valor; viene desmarcada por defecto.
- Al importar, **el saldo de hoy de la cuenta no cambia** (esos movimientos ya están en el saldo que el usuario escribió). Para lograrlo: saldo inicial de la cuenta −= (entradas importadas − salidas importadas). En una tarjeta de crédito: deuda inicial −= compras importadas, y los abonos a la tarjeta no se importan.
- Ejemplo: Davivienda con saldo hoy 3.000.000 (saldo inicial 3.000.000, sin movimientos). Se importan una entrada de 2.350.000 y una salida de 1.300.000 → saldo inicial pasa a 1.950.000 y el saldo de hoy sigue en 3.000.000. Las ventas y gastos del período suben con esos movimientos.
- Deshacer la importación revierte los movimientos y el ajuste del saldo inicial.

---

## C. Productos e inventario

### C1. Costo por unidad y margen
- Costo unitario = materia prima + mano de obra + empaque + otros costos.
- Margen bruto del producto = (precio − costo) / precio.
- Ejemplo: precio 85.000, costo 37.000 → ganas 48.000 por unidad → margen 56,5%.

### C2. Stock por bodega
- El stock se guarda por **variante y bodega**. Stock total de una variante = suma de sus bodegas. Stock de un producto = suma de sus variantes.
- El stock **nunca queda negativo**: cualquier salida mayor a lo disponible en esa bodega se rechaza con un mensaje ("Solo hay 3 en Local").
- Todo cambio de stock pasa por un movimiento de inventario (entrada, salida, venta, devolución, traslado) que queda registrado.
- Lo que llega por producción o importación de catálogo entra a la **bodega principal**.

### C3. Entradas y salidas manuales
- Entrada: stock[variante, bodega] += cantidad. Salida: −= cantidad (validando C2).
- Motivos de entrada: compra a proveedor, producción, devolución de cliente, ajuste de conteo. De salida: merma o daño, regalo o muestra, uso interno, ajuste de conteo.
- Deshacer una entrada solo se permite si todavía hay esas unidades en la bodega.
- Ejemplo: Camiseta Negro/M en Local con 0 → entrada de 5 → 5. Deshacer → 0.

### C4. Traslados entre bodegas
- Origen −= n y destino += n en la misma operación. El total no cambia.
- Ejemplo: Bolso en Principal 28 y Local 14 → mover 5 a Local → 23 y 19 (total 42).

### C5. Valor del inventario
- A costo = Σ unidades × costo unitario. A precio de venta = Σ unidades × precio. Ganancia potencial = la diferencia.
- Se puede ver total o por bodega.
- Alerta "por reponer" si el stock total del producto es menor al stock mínimo.

### C6. Códigos de barras
- Único por negocio: no se puede guardar un código que ya tiene otra variante.
- Los códigos generados por la app son EAN-13 de uso interno: empiezan por "29", 10 dígitos más y el dígito de control.
- Dígito de control EAN-13: suma los 12 primeros dígitos multiplicando por 1 los de posición impar y por 3 los de posición par (contando desde la izquierda, empezando en 1); control = (10 − (suma mód 10)) mód 10.

### C7. Variantes
- Las variantes se arman combinando colores × tallas. Nombre visible: "Color / Talla" (por ejemplo "Negro / M"). Si solo hay una de las dos dimensiones, se usa esa. Sin ninguna: variante "Única".
- Ejemplo: tallas S y M, colores Negro y Blanco → 4 variantes: Negro / S, Negro / M, Blanco / S, Blanco / M.

---

## D. POS (Sirumi POS)

### D1. Totales
- Subtotal = Σ precio × cantidad de cada línea.
- Descuento: porcentaje (subtotal × % redondeado), monto fijo (nunca mayor al subtotal) o código de descuento.
- Total = subtotal − descuento.
- Ejemplo: Bolso 85.000 × 1, 10% de descuento → descuento 8.500 → total 76.500.

### D2. Disponibilidad
- Solo se puede agregar al carrito hasta el stock disponible **en la bodega elegida para vender**. El catálogo muestra el disponible de esa bodega.
- Al cobrar, se descuenta el stock de esa bodega en la misma transacción que guarda la venta.

### D3. Formas de pago
- Efectivo; una por cada cuenta o billetera del negocio; datáfono (llega a la cuenta principal); formas creadas por el usuario con su cuenta de destino (por ejemplo "Datáfono Bold" → Bancolombia); fiado.
- Vuelto (solo efectivo, sin pago dividido) = recibido − total, si el recibido es mayor.
- Pago dividido entre dos formas: primera parte = redondear(total × % elegido); segunda = total − primera. Cada parte es un movimiento de venta en su cuenta.
- Ejemplo: total 100.000 dividido 25% efectivo + 75% Nequi → 25.000 + 75.000.
- **Fiado**: exige elegir un cliente; la venta queda pendiente (por cobrar) y no entra a ninguna cuenta hasta que se cobre. No se puede dividir.

### D4. Venta y devolución
- Cobrar crea, en una sola transacción: la venta con su número consecutivo (POS-0001, POS-0002…), sus líneas, sus movimientos de plata y la salida de stock de la bodega. Si algo falla, no se guarda nada.
- La venta guarda bodega, vendedor (si aplica), cliente y forma de pago.
- Devolución: borra o revierte los movimientos de plata de esa venta, devuelve el stock **a la misma bodega** de donde salió y marca la venta como devuelta. Una venta devuelta no se puede devolver otra vez.

### D5. Cliente en la venta
- Por defecto "Consumidor final".
- Registrar un cliente exige nombre y la casilla "El cliente autoriza guardar sus datos" (Ley 1581). Se guardan celular, correo, tipo y número de documento y notas.
