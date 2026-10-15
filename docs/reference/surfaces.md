# Superficies — Paperfolio

> Cada pantalla o URL pública: quién entra, con qué permiso, qué puede hacer.

| URL | Archivo | Quién entra | Qué hace |
|---|---|---|---|
| `/` | `src/app/(sitio)/page.tsx` | Cualquiera | Landing (PoC, #18): presentación, servicios, proyectos destacados con enlaces a demo y GitHub, trayectoria y formulario de contacto (envía a `POST /api/consultas`) |
| `/ingresar` | `src/app/(auth)/ingresar/page.tsx` | Cualquiera | Botón "Continuar con Google". Con `callbackUrl` (solo rutas internas; otro valor vuelve a `/`) redirige ahí si ya hay sesión; con `error=sesion` o sesión huérfana ofrece "Salir e ingresar de nuevo" |
| `/cuenta` | `src/app/(sitio)/cuenta/page.tsx` | Con sesión (cualquier rol) | Nombre, email y rol (el de la base) y "Salir". Sin sesión redirige a `/ingresar?callbackUrl=%2Fcuenta` |
| `/api/consultas` | `src/app/api/consultas/route.ts` | Cualquiera | `POST` JSON `{ name, email, type, message, sitio_web? }`: `201 { ok: true }` si se guarda o se descarta como bot, `415 TIPO_NO_SOPORTADO` si no es JSON, `400` (`CONSULTA_INVALIDA` con `campos`, o `IP_NO_DETECTADA` sin IP), `429 DEMASIADAS_CONSULTAS` (5 por hora por IP), `503` (`CONFIGURACION_INVALIDA` o `BASE_NO_DISPONIBLE`). Todos con `{ error: { codigo, mensaje } }` |
| `/api/auth/*` | `src/app/api/auth/[...nextauth]/route.ts` | Cualquiera | Rutas de Auth.js: ingreso con Google, callback, sesión y salida |
| `/api/salud` | `src/app/api/salud/route.ts` | Cualquiera | `GET`: `200 { ok: true }` si la base responde a un ping, `503` con `{ error: { codigo, mensaje } }` si no |
