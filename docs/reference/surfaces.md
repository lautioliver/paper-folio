# Superficies — Paperfolio

> Cada pantalla o URL pública: quién entra, con qué permiso, qué puede hacer.

| URL | Archivo | Quién entra | Qué hace |
|---|---|---|---|
| `/` | `src/app/(sitio)/page.tsx` | Cualquiera | Landing (PoC, #18): presentación, servicios, proyectos destacados con enlaces a demo y GitHub, trayectoria y formulario de contacto (envía a `POST /api/consultas`) |
| `/api/consultas` | `src/app/api/consultas/route.ts` | Cualquiera | `POST` JSON `{ name, email, type, message, sitio_web? }`: `201 { ok: true }` si se guarda o se descarta como bot, `415 TIPO_NO_SOPORTADO` si no es JSON, `400` (`CONSULTA_INVALIDA` con `campos`, o `IP_NO_DETECTADA` sin IP), `429 DEMASIADAS_CONSULTAS` (5 por hora por IP), `503` (`CONFIGURACION_INVALIDA` o `BASE_NO_DISPONIBLE`). Todos con `{ error: { codigo, mensaje } }` |
| `/panel` | `src/app/panel/page.tsx` | `operador`, `admin` | Redirige a `/panel/consultas` |
| `/panel/consultas` | `src/app/panel/consultas/page.tsx` | `operador`, `admin` | Bandeja de consultas, de la más nueva a la más vieja: fecha, nombre, tipo, estado y el inicio del mensaje. Filtros `?tipo=` y `?estado=`, y `?pagina=` (20 por página; una página fuera de rango muestra la última; un filtro inválido se ignora). Sin sesión redirige a `/ingresar?callbackUrl=/panel/consultas`; con rol `usuario`, 403 |
| `/api/auth/*` | `src/app/api/auth/[...nextauth]/route.ts` | Cualquiera | Rutas de Auth.js: ingreso con Google, callback, sesión y salida |
| `/api/salud` | `src/app/api/salud/route.ts` | Cualquiera | `GET`: `200 { ok: true }` si la base responde a un ping, `503` con `{ error: { codigo, mensaje } }` si no |
