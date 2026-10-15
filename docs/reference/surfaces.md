# Superficies — Paperfolio

> Cada pantalla o URL pública: quién entra, con qué permiso, qué puede hacer.

| URL | Archivo | Quién entra | Qué hace |
|---|---|---|---|
| `/` | `src/app/(sitio)/page.tsx` | Cualquiera | Landing (PoC, #18): presentación, servicios, proyectos destacados con enlaces a demo y GitHub, trayectoria y formulario de contacto (valida pero todavía no envía) |
| `/api/salud` | `src/app/api/salud/route.ts` | Cualquiera | `GET`: `200 { ok: true }` si la base responde a un ping, `503` con `{ error: { codigo, mensaje } }` si no |
