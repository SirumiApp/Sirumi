# Especificación 01 · Registro y onboarding

Referencia visual y de textos: `referencia/prototipo/Onboarding.dc.html`. Reglas de cálculo: `docs/reglas-de-calculo.md` (A4, A5).

## Pasos
El orden depende de lo que elija la persona. Barra de progreso arriba con un punto por paso del camino.

1. **País**: lista de 10 países con bandera y moneda (Colombia COP, Estados Unidos USD, México MXN, Argentina ARS, Chile CLP, Perú PEN, Ecuador USD, Panamá USD, Brasil BRL, España EUR). Muestra cómo se verán los montos (`$ 1.250.000` o `$ 1,250,000` según el separador del país). Botón secundario: "Tengo un código de vendedor" (v2: deja el botón oculto en la v1).
2. **Tus datos**: nombre (mínimo 2 letras), correo (formato válido), celular con prefijo del país (mínimo 7 dígitos), tipo y número de documento opcional (los tipos dependen del país: en Colombia cédula de ciudadanía, cédula de extranjería, pasaporte, PPT). Errores en rojo debajo de cada campo solo después de intentar continuar.
3. **¿Para qué usarás Sirumi?**: "Mis finanzas personales", "Mi negocio o emprendimiento", "Las dos cosas". Si incluye negocio, pide el nombre del negocio.
4. **Objetivo** (solo si incluye personal). Título: "¿Qué quieres lograr con tu plata?"; si eligió "Las dos cosas": "¿Qué quieres lograr con tu cuenta personal?". Opciones: Solo ver en qué gasto · Ahorrar una cantidad cada mes · Ahorrar para algo puntual · Salir de deudas.
5. **Tu plan** (solo si el objetivo no es "Solo ver"): ingreso mensual + monto según el objetivo (cuánto ahorrar, cuánto abonar a deudas, o nombre, valor y meses de la meta). Muestra "lo máximo que puedes gastar al mes". Validación: el monto debe ser mayor a 0 y menor que el ingreso; mensajes: "Escribe cuánto ganas al mes." / "Escribe el monto para calcular tu plan." / "Ese monto es igual o mayor a lo que ganas. Prueba con uno menor."
6. **Privacidad**: resumen y enlace para leer la política completa (Colombia e internacional, el texto está en el prototipo). Cuatro casillas:
   - Obligatoria: "Acepto los Términos y la Política de privacidad".
   - Obligatoria: "Autorizo el tratamiento de mis datos personales".
   - Opcional: "Permito que la IA lea los archivos que yo suba".
   - Opcional: "Quiero recibir consejos y novedades".
   Botón "Crear mi cuenta". Si faltan las obligatorias, se marcan en rojo y no avanza.
7. **Listo**: resumen de lo elegido y botón para entrar a la app.

## Cuenta
- Registro con correo y contraseña en Supabase Auth (más adelante: Apple y Google). Verificación de correo.
- Al crear la cuenta se guarda el perfil y **una fila por cada autorización** en `consents` con versión de la política, fecha y medio ("app").
- Si eligió negocio, se crea el negocio, el usuario como `owner`, la bodega "Bodega principal" y la cuenta "Efectivo".

## Criterios de aceptación
- No se puede crear la cuenta sin las dos casillas obligatorias.
- Se puede volver atrás en cualquier paso sin perder lo escrito.
- El plan del paso 5 calcula igual que la regla A4/A5 (pruebas).
- La política completa se puede leer antes de aceptar.
