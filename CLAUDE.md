# Sirumi — instrucciones para Claude Code

Sirumi es una app de finanzas para Colombia que junta en un solo lugar la plata personal del dueño y la de su pequeño negocio (emprendimientos, tiendas, ventas en ferias). Pregunta central que la app responde: "¿estoy ganando plata?", en lenguaje simple y sin contabilidad.

Empresa: Texlia Platform S.A.S. (marca comercial Sirumi). Contacto de privacidad: sirumi.app@gmail.com.

## Cómo trabajar
- Todo el texto que ve el usuario va en **español de Colombia**, tuteando, frases cortas y concretas. Nada de jerga contable si hay una palabra simple ("lo que te deben" en vez de "cuentas por cobrar").
- **Idiomas**: la app está en español e inglés y la persona elige (por defecto, el idioma del celular). Ningún texto va escrito directo en una pantalla: todo va en `src/i18n/es.ts` (idioma base) y su traducción en `src/i18n/en.ts`, y se muestra con `t('clave')`. Las funciones de cálculo y validación devuelven códigos (por ejemplo `'planSinIngreso'`), no frases. La prueba `src/i18n/traducciones.test.ts` falla si a un idioma le falta un texto. Para agregar otro idioma: copiar `es.ts`, traducirlo y sumarlo en `src/i18n/index.ts`.
- Dinero en pesos colombianos: `$ 1.250.000` (punto de miles, sin decimales). Fechas: `15 nov 2026`.
- El dueño del producto (Nicolás) no es programador: explica los cambios en español sencillo, sin tecnicismos, y dile cómo probarlos en su celular con Expo Go.
- Trabaja por módulos pequeños, cada uno probado antes de pasar al siguiente (ver `docs/plan.md`).
- La carpeta `referencia/prototipo/` tiene el prototipo aprobado (tres pantallas: `Main` = finanzas personales, `Onboarding`, `Negocio`). Es HTML con lógica en JavaScript: úsalo como guía de pantallas, textos, flujos y cálculos, pero no copies su estructura técnica. Las imágenes `/_blob/...` de ese HTML equivalen a los PNG de `assets/emojis/` (ver `assets/emojis/mapa-emojis.json`).

## Tecnología
- App: React Native con **Expo** (SDK estable más reciente), **TypeScript** estricto, Expo Router para la navegación.
- Servidor: **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions). Región: East US (us-east-1).
- Cada tabla con datos de usuario lleva **Row Level Security**: cada persona solo ve lo suyo, y en un negocio solo sus miembros según su rol.
- Las claves van en `.env` (nunca en el repositorio). Usa la clave pública (anon) en la app; la clave de servicio jamás va en la app.
- Builds para las tiendas con EAS (en la nube; no hace falta Mac).

## Marca (ver `docs/marca.md`)
- Colores principales: Noche `#1B2B5E`, Cielo `#5FA9E0`, Acción `#2F6DB5` (botones con texto blanco), Nube `#F5F7FA` (fondo claro).
- Tipografías: **Sora** 600 para títulos, cifras y la palabra "sirumi" (siempre en minúscula); **Inter** 400/600 para el resto.
- Emojis: usa siempre los PNG 3D de `assets/emojis/`, no los emojis del sistema. Las banderas de países sí van como emoji normal.
- Logo: `assets/marca/cohete.png`. Lema: "Tu plata, hacia arriba."
- Contraste: no pongas texto blanco sobre Cielo; usa Noche sobre Cielo y blanco sobre Acción o Noche.
- Modo oscuro desde el principio: fondo Noche, tarjetas `#24376F`, texto suave `#BCC8E6`.

## Reglas de datos (Ley 1581 de Colombia)
- Pedir autorización expresa en el onboarding y guardar prueba: fecha, versión de la política y medio.
- Los clientes que cada negocio registra en su POS son **del negocio**. Sirumi solo los guarda por encargo: nunca usarlos para mercadeo propio ni cruzarlos entre negocios.
- Al registrar un cliente en el POS, exigir la casilla "El cliente autoriza guardar sus datos".
- Medición de uso para growth solo con usuarios que aceptaron recibir novedades; nunca enviar montos ni datos financieros a herramientas de analítica.
- El usuario debe poder exportar y borrar sus datos desde Ajustes.
- La app es para mayores de 18 años.

## Alcance de la versión 1
Sí: registro e inicio de sesión, onboarding, finanzas personales (movimientos, topes, metas, deudas), negocio (cuentas y tarjetas de crédito con nombres libres, movimientos, informes), POS (Sirumi POS), productos con tallas, colores y códigos de barras, inventario por bodegas, entradas y salidas de mercancía, clientes.
Para la v2: vendedores con código, extractos en PDF con IA, voz, pronóstico de caja, CRM por negocio.

## Calidad
- Antes de dar algo por terminado: que compile sin errores de TypeScript, que pase el linter y que las pruebas de los cálculos de dinero pasen (sumas, saldos, stock por bodega).
- Los cálculos de dinero y stock van en funciones puras con pruebas, separadas de las pantallas.
- Botones de al menos 44 puntos de alto y textos legibles.
