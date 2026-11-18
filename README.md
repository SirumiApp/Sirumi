# sirumi

Tu plata, hacia arriba. App de finanzas personales y de negocio para Colombia (Expo + TypeScript).

## Comandos
- `npm install` — instala lo necesario (solo la primera vez).
- `npx expo start` — abre la app para probarla en el celular con Expo Go (escanea el código QR).
- `npm run check` — revisa tipos, linter y pruebas.
- `npm run emojis` — vuelve a generar el catálogo de emojis después de agregar PNG en `assets/emojis/`.

## Carpetas
- `app/` pantallas (Expo Router).
- `src/components` componentes (`<Emoji name="..." />`, `Texto`, `Tarjeta`, `Logo`...).
- `src/theme` colores, fuentes y modo claro/oscuro.
- `src/lib` cálculos y formatos (con pruebas).
- `supabase/migrations` base de datos (aún vacía).
- `docs/` plan, marca y modelo de datos. `referencia/prototipo/` prototipo aprobado.
