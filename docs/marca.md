# Marca Sirumi

Nombre: **sirumi** (en minúscula en el logo). Viene de "siruma", que significa "cielo" en wayuunaiki. Lema: "Tu plata, hacia arriba."

> **Decisión de nov 2026 (Nicolás):** se adopta el diseño del prototipo "Prototipo_App_de_Finanzas" (azul brillante,
> letra Plus Jakarta Sans muy gruesa, tarjetas blancas con sombra azul, barra flotante con + en el centro) mezclado con la
> marca Sirumi: Noche para textos y modo oscuro, Cielo, el logo cohete con "sirumi" en Sora y los emojis 3D.
> Los valores exactos viven en `src/theme/` (colores.ts, fuentes.ts, sombras.ts).

## Colores
| Nombre | Hex | Uso |
|---|---|---|
| Noche | `#1B2B5E` | Texto principal, fondo del modo oscuro |
| Acción | `#1F6FEB` | Botones principales (texto blanco), elementos activos, enlaces |
| Cielo | `#5FA9E0` | Color de marca, acentos |
| Nube | `#F4F8FF` | Fondo claro (celeste muy suave) |
| Blanco | `#FFFFFF` | Tarjetas en modo claro |
| Azul suave | `#E6F0FF` | Chips de información, recomendaciones, opción elegida |
| Plata | `#E3EBF8` | Bordes y líneas |
| Verde | `#5CC08A` / `#0A7A4B` | Ingresos y positivo (relleno / texto) |
| Cuidado | `#FFF4C7` / `#854D0E` | Fondo y texto del estado "Cuidado" |
| Superado | `#FFE9DA` / `#9A3412` | Fondo y texto del estado "Superado" o "Te pasaste" |
| Sol | `#F5CF6B` | Destacados, logros |

Texto suave: `#56657F` (claro) y `#BCC8E6` (oscuro). Tarjeta oscura: `#24376F`. Enlace en oscuro: `#7DB6FF`.
Sombras: tarjetas `0 6 24` de Acción al 8%; botón + y principal `0 8 20` de Acción al 40%; barra flotante `0 10 30` de Noche al 14%.
Radios: tarjetas 20, chips y botones en píldora.

## Tipografía
- **Plus Jakarta Sans** 800: títulos y cifras (la cifra principal de cada pantalla a 46 px).
- **Plus Jakarta Sans** 400, 600 y 700: textos, etiquetas y botones.
- **Sora** 600: solo la palabra "sirumi" del logo (siempre en minúscula).
Paquetes: `@expo-google-fonts/plus-jakarta-sans` y `@expo-google-fonts/sora`.

## Íconos
- Navegación y botones (casa, gráfica, moneda, +, ajustes, luna, lupa…): íconos de línea de 2 px (`src/components/Icono.tsx`).
- Contenido (categorías, consejos, metas, estados): emojis 3D.

## Emojis 3D
- Están en `assets/emojis/` (PNG con fondo transparente, 256 px).
- `mapa-emojis.json` dice qué emoji del sistema reemplaza cada archivo (por ejemplo `"🛍️": "bolsas-de-compras"`).
- Los que tienen partes azul Noche (celular, micrófono, balanza) se ven mejor sobre fondos claros; en modo oscuro ponlos sobre una tarjeta.

## Logo
`assets/marca/cohete.png`: el cohete sin fondo. El ícono de la app es el cohete con "sirumi" debajo.

## Tono
Cercano, claro y optimista, como un amigo que sabe de plata. Tuteo. Frases cortas. Sin regaños.
