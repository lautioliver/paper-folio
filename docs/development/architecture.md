# Arquitectura implementada — Paperfolio

> Lo que corre hoy. Si otro documento dice otra cosa, gana este (y el código).

Stack: [ADR-001](../decisions/ADR-001-stack.md). Hoy existe el scaffold: un proyecto Next.js 16 (App Router, Turbopack) con conexión a MongoDB y sin auth.

## Qué corre

- **Next.js 16.4** con React 19 y TypeScript estricto. `next.config.ts` deja activos `cacheComponents` y `partialPrefetching`, que vienen por defecto en `create-next-app`.
- **Tailwind 4**, procesado por `@tailwindcss/turbopack` (configurado en `next.config.ts`; no hay `postcss.config`). Los estilos globales están en `src/styles/globals.css` y los importa `src/app/layout.tsx`.
- **Fuentes:** Geist y Geist Mono con `next/font`. Son provisorias: las reemplazan los tokens del #7.
- **MongoDB con Mongoose 9.** `src/lib/db.ts` exporta `conectar()`, que abre la conexión una vez y la reusa (se cachea en `globalThis`, para serverless y para las recargas de `next dev`). Las variables las valida con Zod `src/lib/env.ts`. Todavía no hay modelos: cada feature crea los suyos en `src/models/`.
- **`GET /api/salud`:** `200 { ok: true }` si la base responde a un ping; si no, `503` con `{ error: { codigo, mensaje } }`, sin el detalle del fallo.
- **ESLint 9** con `eslint-config-next` (core-web-vitals + TypeScript), en `eslint.config.mjs`.
- **Vitest 5** en entorno `node`, con `mongodb-memory-server` para los tests de la base (ver [setup](setup.md)). Toma solo los tests `src/**/*.test.ts`: los de componentes (`.tsx`) esperan a que haya jsdom. Resuelve el alias `@/` → `src/` (`vitest.config.ts`).

## Estructura

```
src/
  app/
    layout.tsx        # html lang="es-AR", fuentes, metadata desde siteConfig
    (sitio)/page.tsx  # portada (sitio público)
    api/salud/route.ts # health check de la base
  components/         # componentes de UI compartidos
  lib/                # utilidades y servicios
  styles/globals.css  # Tailwind y tokens
```

Los grupos de rutas siguen `.github/labeler.yml`: `(sitio)` es lo público. `(auth)` y `panel/` llegan con sus features.

Ver [módulos](../reference/modules.md) y [superficies](../reference/surfaces.md).
