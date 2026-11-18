# sirumi

Tu plata, hacia arriba. App de finanzas personales y de negocio para Colombia (Expo + TypeScript).

## Comandos
- `npm install` — instala lo necesario (solo la primera vez).
- `npx expo start` — abre la app para probarla en el celular con Expo Go (escanea el código QR).
- `npm run publicar -- --message "qué cambió"` — publica la app en Expo (cuenta sirumiapps-team) para abrirla en Expo Go sin computador.
- `npm run check` — revisa tipos, linter y pruebas.
- `npm run emojis` — vuelve a generar el catálogo de emojis después de agregar PNG en `assets/emojis/`.

## Carpetas
- `app/` pantallas (Expo Router).
- `src/components` componentes (`<Emoji name="..." />`, `Texto`, `Tarjeta`, `Logo`...).
- `src/theme` colores, fuentes y modo claro/oscuro.
- `src/lib` cálculos y formatos (con pruebas).
- `supabase/migrations` base de datos (se aplican en orden). `supabase/tests` pruebas de seguridad (RLS). `supabase/plantillas` correos en español.
- `docs/` plan, marca y modelo de datos. `referencia/prototipo/` prototipo aprobado.

## Supabase
- Proyecto de desarrollo: `sirumi-dev` (ref `jztukmmqvggcrmhxlger`, región us-east-2). Para producción hay que crear uno en us-east-1.
- La app usa solo la clave pública (`.env`, ver `.env.example`). En Expo están guardadas como variables `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY`.
- Mientras desarrollamos, la confirmación del correo está **desactivada** (se entra apenas se crea la cuenta). Antes del lanzamiento hay que volver a activarla.
- Pendiente antes del lanzamiento: conectar un servicio de correo propio (SMTP) para poder usar las plantillas de `supabase/plantillas` (código de 6 números) y quitar el límite de 2 correos por hora.
