# Arquitectura implementada — Paperfolio

> Lo que corre hoy. Si otro documento dice otra cosa, gana este (y el código).

Stack: [ADR-001](../decisions/ADR-001-stack.md). Hoy existe el scaffold: un proyecto Next.js 16 (App Router, Turbopack) sin base de datos ni auth.

## Qué corre

- **Next.js 16.4** con React 19 y TypeScript estricto. `next.config.ts` deja activos `cacheComponents` y `partialPrefetching`, que vienen por defecto en `create-next-app`.
- **Tailwind 4**, procesado por `@tailwindcss/turbopack` (configurado en `next.config.ts`; no hay `postcss.config`). Los estilos globales están en `src/styles/globals.css` y los importa `src/app/layout.tsx`.
- **Fuentes:** Space Grotesk con `next/font/google`. Es provisoria: la define el manual de marca.
- **ESLint 9** con `eslint-config-next` (core-web-vitals + TypeScript), en `eslint.config.mjs`.
- **Vitest 5** en entorno `node`. Toma solo los tests `src/**/*.test.ts`: los de componentes (`.tsx`) esperan a que haya jsdom. Resuelve el alias `@/` → `src/` (`vitest.config.ts`).

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

## Tokens de diseño

**Provisorios.** Los valores salen de `docs/diseno/portfolio-paperfolio.pdf`, muestreados del render, y los reemplaza el manual de marca (hito 0). Viven en `src/styles/globals.css` (`@theme`), y son el único lugar con HEX: en `src/**/*.tsx` no hay colores sueltos.

- **Colores** (nombres semánticos, no por tono): `primario` (amarillo), `acento` (coral), `secundario` (azul), `terciario` (índigo), `tinta` (negro), `papel` (blanco), `superficie` (gris claro). Se usan como `bg-primario`, `text-tinta`, etc.
- **Tipografía:** Space Grotesk (`font-sans`, con `next/font/google`). Escala: `text-h1`, `text-h2`, `text-h3`, `text-cuerpo`, `text-pequeno`.
- **Estilo neo-brutalista:** `--borde-marca` (2px, con `border-(length:--borde-marca)`), `rounded-marca` y `shadow-marca` (sombra dura de 4px en `tinta`).
- **Uso de referencia:** la portada aplica los tokens en el título y en un botón.
- Las pruebas que los exigen están en `src/styles/tokens.test.ts`.

Ver [módulos](../reference/modules.md) y [superficies](../reference/surfaces.md).
