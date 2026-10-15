# Módulos — Paperfolio

> Dónde vive cada cosa en el código y qué es responsable de qué.

| Módulo | Responsable de |
|---|---|
| `src/lib/site.ts` | Datos del sitio (`siteConfig`: nombre y descripción) para la metadata y la UI |
| `src/lib/cn.ts` | `cn()`: une clases y descarta las vacías (clases condicionales). No resuelve conflictos de Tailwind (`px-4` y `px-0` quedan las dos) |
| `src/components/Container.tsx` | Ancho máximo y márgenes laterales de las secciones |
