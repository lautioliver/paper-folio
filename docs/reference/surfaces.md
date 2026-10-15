# Superficies — Paperfolio

> Cada pantalla o URL pública: quién entra, con qué permiso, qué puede hacer.

| URL | Archivo | Quién entra | Qué hace |
|---|---|---|---|
| `/` | `src/app/(sitio)/page.tsx` | Cualquiera | Landing (PoC, #18): presentación, servicios, proyectos destacados con enlaces al caso de estudio, a la demo (ambos piden ingresar) y a GitHub, trayectoria y formulario de contacto (envía a `POST /api/consultas`) |
| `/ingresar` | `src/app/(auth)/ingresar/page.tsx` | Cualquiera | Botón "Continuar con Google". Con `callbackUrl` (solo rutas internas; otro valor vuelve a `/`) redirige ahí si ya hay sesión; con `error=sesion` o sesión huérfana ofrece "Salir e ingresar de nuevo" |
| `/cuenta` | `src/app/(sitio)/cuenta/page.tsx` | Con sesión (cualquier rol) | Nombre, email y rol (el de la base) y "Salir". Sin sesión redirige a `/ingresar?callbackUrl=%2Fcuenta` |
| `/proyectos` | `src/app/(sitio)/proyectos/page.tsx` | Cualquiera | Listado de todos los proyectos, con las mismas tarjetas de la landing; "Ver caso de estudio" lleva al detalle |
| `/proyectos/[slug]` | `src/app/(sitio)/proyectos/[slug]/page.tsx` | Usuario registrado (cualquier rol) | Caso de estudio (problema, solución, funcionalidades y stack, de los README públicos), demo en un `iframe` con `sandbox` y el enlace "Abrir en otra pestaña", siempre visible por si el sitio no deja embeberse. Sin sesión redirige a `/ingresar?callbackUrl=<ruta>` (`proxy.ts` y `requerirSesion` en el servidor). Slug inexistente: `notFound()` |
| `/api/consultas` | `src/app/api/consultas/route.ts` | Cualquiera | `POST` JSON `{ name, email, type, message, sitio_web? }`: `201 { ok: true }` si se guarda o se descarta como bot, `415 TIPO_NO_SOPORTADO` si no es JSON, `400` (`CONSULTA_INVALIDA` con `campos`, o `IP_NO_DETECTADA` sin IP), `429 DEMASIADAS_CONSULTAS` (5 por hora por IP), `503` (`CONFIGURACION_INVALIDA` o `BASE_NO_DISPONIBLE`). Todos con `{ error: { codigo, mensaje } }` |
| `/api/imagenes` | `src/app/api/imagenes/route.ts` | Solo `admin` | `POST` `multipart/form-data` con `archivo` (PNG, JPEG o WebP por su firma, hasta 2 MB y 2000×2000 px): `201 { url }` con la URL pública de Vercel Blob. Sin sesión redirige a `/ingresar`; con otro rol, `403` sin leer el archivo. Errores: `403 ORIGEN_NO_PERMITIDO` (`Sec-Fetch-Site` de otro sitio o subdominio), `415 TIPO_NO_SOPORTADO`, `400 ARCHIVO_FALTANTE`, `400`/`413 IMAGEN_INVALIDA` (con `motivo`), `503` (`CONFIGURACION_INVALIDA` o `SUBIDA_FALLIDA`) |
| `/panel` | `src/app/panel/page.tsx` | `operador`, `admin` | Redirige a `/panel/consultas` |
| `/panel/consultas` | `src/app/panel/consultas/page.tsx` | `operador`, `admin` | Bandeja de consultas, de la más nueva a la más vieja: fecha, nombre, tipo, estado y el inicio del mensaje. Filtros `?tipo=` y `?estado=`, y `?pagina=` (20 por página; una página fuera de rango muestra la última; un filtro inválido se ignora). Sin sesión redirige a `/ingresar?callbackUrl=/panel/consultas`; con rol `usuario`, 403 |
| `/api/auth/*` | `src/app/api/auth/[...nextauth]/route.ts` | Cualquiera | Rutas de Auth.js: ingreso con Google, callback, sesión y salida |
| `/api/salud` | `src/app/api/salud/route.ts` | Cualquiera | `GET`: `200 { ok: true }` si la base responde a un ping, `503` con `{ error: { codigo, mensaje } }` si no |
