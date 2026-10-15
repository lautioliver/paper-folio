# Arquitectura implementada — Paperfolio

> Lo que corre hoy. Si otro documento dice otra cosa, gana este (y el código).

Stack: [ADR-001](../decisions/ADR-001-stack.md). Hoy existe el scaffold: un proyecto Next.js 16 (App Router, Turbopack) sin base de datos ni auth.

## Qué corre

- **Next.js 16.4** con React 19 y TypeScript estricto. `next.config.ts` deja activos `cacheComponents` y `partialPrefetching`, que vienen por defecto en `create-next-app`.
- **Tailwind 4**, procesado por `@tailwindcss/turbopack` (configurado en `next.config.ts`; no hay `postcss.config`). Los estilos globales están en `src/styles/globals.css` y los importa `src/app/layout.tsx`.
- **Fuentes:** Geist y Geist Mono con `next/font`. Son provisorias: las reemplazan los tokens del #7.
- **ESLint 9** con `eslint-config-next` (core-web-vitals + TypeScript), en `eslint.config.mjs`.
- **Vitest 5** en entorno `node`. Toma los tests `src/**/*.test.ts(x)` y resuelve el alias `@/` → `src/` (`vitest.config.ts`).

## Estructura

```
src/
  app/
    layout.tsx        # html lang="es-AR", fuentes, metadata desde siteConfig
    (sitio)/page.tsx  # portada (sitio público)
  components/         # componentes de UI compartidos
  lib/                # utilidades y servicios
  styles/globals.css  # Tailwind y tokens
```

Los grupos de rutas siguen `.github/labeler.yml`: `(sitio)` es lo público. `(auth)` y `panel/` llegan con sus features.

Ver [módulos](../reference/modules.md) y [superficies](../reference/surfaces.md).
