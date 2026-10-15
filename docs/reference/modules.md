# Módulos — Paperfolio

> Dónde vive cada cosa en el código y qué es responsable de qué.

| Módulo | Responsable de |
|---|---|
| `src/lib/site.ts` | Datos del sitio (`siteConfig`: nombre y descripción) para la metadata y la UI |
| `src/lib/cn.ts` | `cn()`: une clases y descarta las vacías (clases condicionales). No resuelve conflictos de Tailwind (`px-4` y `px-0` quedan las dos) |
| `src/lib/env.ts` | Valida con Zod las variables del servidor (`MONGODB_URI`, `MONGODB_DB`) y las expone tipadas (`env`, `leerEnv()`). Los errores nombran la variable, nunca el valor |
| `src/lib/db.ts` | `conectar()`: conexión de Mongoose cacheada en `globalThis`; `desconectar()` la cierra (para tests). Nunca loguea la URI |
| `src/app/api/salud/route.ts` | `GET /api/salud`: health check de la base (ping) |
| `src/components/Container.tsx` | Ancho máximo y márgenes laterales de las secciones |
