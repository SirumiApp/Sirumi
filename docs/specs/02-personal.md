# Especificación 02 · Finanzas personales

Referencia: `referencia/prototipo/Main.dc.html`. Reglas: `docs/reglas-de-calculo.md`, sección A.

## Pantallas
1. **Inicio**
   - Selector de período arriba: Este mes, Mes pasado, Últimos 3 meses, Este año, o rango en un calendario (no deja escoger días futuros).
   - Total gastado del período y variación contra el período anterior (A2).
   - Tarjeta del plan del mes si la persona hizo plan en el onboarding (A4): barra, estado (Vas bien / Cuidado / Te pasaste) y cuánto le queda por día.
   - Tarjetas por categoría con barra relativa; tocar una filtra la lista.
   - Un consejo (insight) del período: la categoría más grande y, si pasa su tope, cuánto ahorraría si la baja.
   - Lista de movimientos agrupados por día ("Hoy", "Ayer", "13 nov"), con total del día. Buscador por texto o categoría.
2. **Registrar movimiento** (hoja desde abajo): gasto o ingreso, teclado numérico propio (con botón 000), categoría, descripción opcional y fecha. Editar y borrar con confirmación.
3. **Topes** (presupuestos): un tope mensual por categoría, alerta activable con umbral (por defecto 80%), estados de la regla A3.
4. **Análisis**: gráfica de los últimos 6 meses con la línea de ingresos, proyección de cierre del mes, consejos (ritmo del mes, shopping > 10% de lo que ganas, regla 50/30/20, tasa de ahorro, gastos hormiga, topes superados) y comparación por categoría contra el mes anterior.
5. **Plan**: pestañas Metas, Deudas y Patrimonio.
   - Metas: barra de progreso, botones para abonar, "¡Meta cumplida!" al llegar.
   - Deudas: saldo, tasa EA, cuota mínima, intereses estimados del mes, prioridad sugerida (A6) y botones para abonar.
   - Patrimonio: activos editables, ahorrado en metas, deudas, patrimonio neto (A7) y su evolución.
6. **Ajustes**: categorías, topes, período por defecto, moneda, apariencia (claro, oscuro, automático), notificaciones, exportar CSV, borrar mis datos, legal.

## Categorías iniciales
Shopping, Comida fuera, Transporte, Mercado, Salidas, Mascotas, más Ingreso. Cada una con su emoji 3D y color suave. El usuario puede crear, renombrar y ocultar categorías.

## Fuera de la v1
Registro por voz, conexión con WhatsApp, rastreo automático con mensajes del banco, listas compartidas, conversión de monedas.

## Criterios de aceptación
- Todos los cálculos de la sección A con pruebas.
- Cambiar el período actualiza total, comparación, categorías, lista y topes.
- La app arranca vacía (sin datos de ejemplo) y explica qué hacer: "Registra tu primer gasto".
