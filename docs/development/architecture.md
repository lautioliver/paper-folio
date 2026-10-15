# Arquitectura implementada — Paperfolio

> Lo que corre hoy. Si otro documento dice otra cosa, gana este (y el código).

Stack: [ADR-001](../decisions/ADR-001-stack.md). Hoy existe el scaffold: un proyecto Next.js 16 (App Router, Turbopack) con conexión a MongoDB y sin auth.

## Qué corre

- **Next.js 16.4** con React 19 y TypeScript estricto. `next.config.ts` deja activos `cacheComponents` y `partialPrefetching`, que vienen por defecto en `create-next-app`.
- **Tailwind 4**, procesado por `@tailwindcss/turbopack` (configurado en `next.config.ts`; no hay `postcss.config`). Los estilos globales están en `src/styles/globals.css` y los importa `src/app/layout.tsx`.
- **Fuente:** Onest con `next/font/google`, la del diseño (identificada en el manual de marca, #18).
- **MongoDB con Mongoose 9.** `src/lib/db.ts` exporta `conectar()`, que abre la conexión una vez y la reusa (se cachea en `globalThis`, para serverless y para las recargas de `next dev`). Las variables las valida con Zod `src/lib/env.ts`. Los modelos van en `src/models/` (hoy, `Consulta`). Como la conexión usa `bufferCommands: false`, los modelos se registran con `autoIndex` y `autoCreate` en `false` y el servicio que los usa crea sus índices (`crearConsulta()` lo hace para `consultas`).
- **`GET /api/salud`:** `200 { ok: true }` si la base responde a un ping; si no, `503` con `{ error: { codigo, mensaje } }`, sin el detalle del fallo.
- **ESLint 9** con `eslint-config-next` (core-web-vitals + TypeScript), en `eslint.config.mjs`.
- **Vitest 5** en entorno `node`, con `mongodb-memory-server` para los tests de la base (ver [setup](setup.md)). Toma solo los tests `src/**/*.test.ts`: los de componentes (`.tsx`) esperan a que haya jsdom. Resuelve el alias `@/` → `src/` (`vitest.config.ts`).

## Estructura

```
src/
  app/
    layout.tsx        # html lang="es-AR", fuentes, metadata desde siteConfig
    (sitio)/page.tsx  # landing: arma las secciones de components/sitio
    api/salud/route.ts # health check de la base
  components/         # componentes de UI compartidos
    sitio/            # secciones de la landing, formulario de contacto, ilustraciones
  content/profile.ts  # datos del PoC (#18): perfil y repos públicos de GitHub
  lib/                # utilidades y servicios
  styles/globals.css  # Tailwind y tokens
```

Los grupos de rutas siguen `.github/labeler.yml`: `(sitio)` es lo público. `(auth)` y `panel/` llegan con sus features.

## Landing (PoC, #18)

- **Secciones**, en el orden del manual: barra, hero, banda del stack, servicios, sobre mí, proyectos, trayectoria, contacto y pie. Son componentes de servidor; solo `Navbar`, `StackBand`, `Reveal` y `ContactForm` son de cliente.
- **Contenido** estático en `src/content/profile.ts`, con datos públicos de GitHub. Lo reemplaza el CRUD del admin (hito 5).
- **Formulario de contacto:** valida con `parseContactRequest` (`src/lib/contact.ts`, Zod), la misma regla que va a usar el servidor, pero todavía no envía. El envío por email llega con el hito 2.
- **Movimiento:** `Reveal` marca `data-visible` con IntersectionObserver (entrada al hacer scroll) y la banda del stack se desplaza con CSS (se pausa con un botón o con el hover). Sin JS el contenido se ve; con `prefers-reduced-motion` todo queda fijo.

## Tokens de diseño

**Provisorios.** Los valores salen de `docs/diseno/portfolio-paperfolio.pdf`, muestreados del render, y los reemplaza el manual de marca (hito 0). Viven en `src/styles/globals.css` (`@theme`), y son el único lugar con HEX: en `src/**/*.tsx` no hay colores sueltos.

- **Colores** (nombres semánticos, no por tono): `primario` (amarillo), `acento` (coral), `secundario` (azul), `terciario` (índigo), `tinta` (negro), `papel` (blanco), `superficie` (gris claro). Se usan como `bg-primario`, `text-tinta`, etc.
- **Tipografía:** Onest (`font-sans`, con `next/font/google`). Escala: `text-h1`, `text-h2`, `text-h3`, `text-cuerpo`, `text-pequeno`.
- **Estilo neo-brutalista:** `--borde-marca` (2px, con `border-(length:--borde-marca)`), `rounded-marca` y `shadow-marca` (sombra dura de 4px en `tinta`).
- **Utilidades de marca:** `contorno` (borde y radio, para tarjetas), `marca` (contorno más la sombra dura) y `apretable` (el botón se "aprieta" en hover y active), definidas con `@utility` en `globals.css`.
- Las pruebas que los exigen están en `src/styles/tokens.test.ts`.

Ver [módulos](../reference/modules.md) y [superficies](../reference/surfaces.md).
