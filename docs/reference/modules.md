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
| `src/lib/contact.ts` | `parseContactRequest()`: valida la consulta del formulario (nombre, email, tipo `general`/`cotizacion`/`asesoria`, mensaje de 10 a 2000 caracteres) y devuelve un error por campo |
| `src/content/profile.ts` | Datos del PoC: perfil, stack, servicios, proyectos y trayectoria, con datos públicos de GitHub |
| `src/components/sitio/` | Secciones de la landing (`Sections.tsx`, `Contact.tsx`), `Navbar` (menú de celular: inerte afuera, Escape, se cierra en PC), `StackBand` (banda con pausa), `ContactForm`, `Reveal` (entrada con GSAP ScrollTrigger; sin JS o con reduced-motion se ve fijo), `HeroMotion`, `ShareButton` y `CopyProfileLink`, `Highlight` y `SectionTitle`, `tones.ts` (clases de color por tono) e ilustraciones SVG con tokens |
