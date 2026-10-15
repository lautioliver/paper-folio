# Arquitectura implementada — Paperfolio

> Lo que corre hoy. Si otro documento dice otra cosa, gana este (y el código).

Stack: [ADR-001](../decisions/ADR-001-stack.md). Hoy existe el scaffold: un proyecto Next.js 16 (App Router, Turbopack) con conexión a MongoDB y sin auth.

## Qué corre

- **Next.js 16.4** con React 19 y TypeScript estricto. `next.config.ts` deja activos `cacheComponents` y `partialPrefetching`, que vienen por defecto en `create-next-app`.
- **Tailwind 4**, procesado por `@tailwindcss/turbopack` (configurado en `next.config.ts`; no hay `postcss.config`). Los estilos globales están en `src/styles/globals.css` y los importa `src/app/layout.tsx`.
- **Fuente:** Onest con `next/font/google`, la del diseño (identificada en el manual de marca, #18).
- **MongoDB con Mongoose 9.** `src/lib/db.ts` exporta `conectar()`, que abre la conexión una vez y la reusa (se cachea en `globalThis`, para serverless y para las recargas de `next dev`). Las variables las valida con Zod `src/lib/env.ts`. Los modelos van en `src/models/` (hoy, `Consulta`). Como la conexión usa `bufferCommands: false`, los modelos se registran con `autoIndex` y `autoCreate` en `false` y el servicio que los usa crea sus índices (`crearConsulta()` lo hace para `consultas`).
- **`GET /api/salud`:** `200 { ok: true }` si la base responde a un ping; si no, `503` con `{ error: { codigo, mensaje } }`, sin el detalle del fallo.
- **`POST /api/consultas`:** ruta fina sobre `crearConsulta()`. Exige `Content-Type: application/json` (`415 TIPO_NO_SOPORTADO` si no: así otra página no puede mandar consultas con `no-cors` y la IP de sus visitantes). Lee la IP de `x-forwarded-for` (primer valor) o `x-real-ip` (`src/lib/ip.ts`) y responde `201 { ok: true }` (`creada` o `descartada`, para que un bot no distinga), `400 CONSULTA_INVALIDA` (con `campos`), `400 IP_NO_DETECTADA` (sin IP no hay límite por visitante, así que no se guarda), `429 DEMASIADAS_CONSULTAS`, `503 CONFIGURACION_INVALIDA` o `503 BASE_NO_DISPONIBLE`. Los 503 se manejan como en `/api/salud`: nada sensible en el log ni en la respuesta.
- **ESLint 9** con `eslint-config-next` (core-web-vitals + TypeScript), en `eslint.config.mjs`.
- **Vitest 5** en entorno `node`, con `mongodb-memory-server` para los tests de la base (ver [setup](setup.md)). Toma solo los tests `src/**/*.test.ts`: los de componentes (`.tsx`) esperan a que haya jsdom. Resuelve el alias `@/` → `src/` (`vitest.config.ts`).

## Estructura

```
src/
  app/
    layout.tsx        # html lang="es-AR", fuentes, metadata desde siteConfig
    (sitio)/page.tsx  # landing: arma las secciones de components/sitio
    panel/            # bandeja del operador (#37): layout con la guarda de rol y consultas/page.tsx
    api/salud/route.ts # health check de la base
    api/consultas/route.ts # POST: guarda una consulta de contacto
  components/         # componentes de UI compartidos
    sitio/            # secciones de la landing, formulario de contacto, ilustraciones
  content/profile.ts  # datos del PoC (#18): perfil y repos públicos de GitHub
  lib/                # utilidades y servicios
  styles/globals.css  # Tailwind y tokens
```

Los grupos de rutas siguen `.github/labeler.yml`: `(sitio)` es lo público y `panel/` el panel del operador. `(auth)` llega con su feature.

## Autenticación y roles (#32, ADR-002)

- **Auth.js v5** con Google y sesión JWT (`src/auth.ts`, rutas en `/api/auth/*`). Al ingresar se crea o actualiza el usuario en `usuarios` con su rol (`ADMIN_EMAILS` y `OPERADOR_EMAILS`).
- **Permisos:** `requerirSesion` y `requerirRol` (`src/lib/permisos.ts`) releen el rol de la base. Sin sesión redirigen a `/ingresar`; sin permiso, `forbidden()` responde 403 (`experimental.authInterrupts` en `next.config.ts`).
- **Panel (#37):** `/panel/**` exige `operador` o `admin`. El control real es `requerirRol` en el layout y en cada página, en el servidor; el proxy (#34) sumará `/panel` después. Como `auth()` lee cookies, con `cacheComponents` la guarda va dentro de `Suspense` y detrás de `connection()`: la respuesta empieza a enviarse antes de resolver el permiso, así que el 403 y la redirección llegan en el stream (HTTP 200), no como estado HTTP. Todavía no están protegidos el detalle de proyectos (#34) ni la pantalla de ingreso (#35).

## Landing (PoC, #18)

- **Secciones**, en el orden del manual: barra, hero, banda del stack, servicios, sobre mí, proyectos, trayectoria, contacto y pie. Son componentes de servidor; solo `Navbar`, `StackBand`, `Reveal`, `HeroMotion`, `ShareButton`, `CopyProfileLink` y `ContactForm` son de cliente.
- **Contenido** estático en `src/content/profile.ts`, con datos públicos de GitHub. Lo reemplaza el CRUD del admin (hito 5).
- **Formulario de contacto:** valida con `parseContactRequest` (`src/lib/contact.ts`, Zod), la misma regla del servidor, y envía con `POST /api/consultas`. Muestra "Enviando…" con el botón deshabilitado, un agradecimiento al guardarse, los errores del servidor (400) en sus campos y un mensaje general con 429, 503 o un error de red. El campo trampa `sitio_web` está oculto para personas y lectores de pantalla y fuera del tabulador.
- **Movimiento:** GSAP (registrado en `src/lib/gsap.ts`, solo en componentes de cliente). `HeroMotion` anima en secuencia los elementos `data-hero` del hero (menos de 1 s) y `Reveal` hace la entrada al hacer scroll con `ScrollTrigger` (lo que ya está en pantalla al cargar no se anima). Las animaciones se crean dentro de `gsap.matchMedia` con `prefers-reduced-motion: no-preference`: sin JS o con reduced-motion el contenido se ve fijo. La banda del stack se desplaza con CSS (se pausa con un botón o con el hover).
- **APIs Web:** `ShareButton` (en cada proyecto) usa `navigator.share` y, si no existe o falla, copia el link con la Clipboard API; `CopyProfileLink` (en el contacto) copia el link del perfil. Los dos avisan en un `role="status"`. La lógica está en `src/lib/share.ts` (`shareOrCopy`, `copyText`), que no lanza: si no hay API devuelve el error y la UI lo dice.

## Tokens de diseño

**Provisorios.** Los valores salen de `docs/diseno/portfolio-paperfolio.pdf`, muestreados del render, y los reemplaza el manual de marca (hito 0). Viven en `src/styles/globals.css` (`@theme`), y son el único lugar con HEX: en `src/**/*.tsx` no hay colores sueltos.

- **Colores** (nombres semánticos, no por tono): `primario` (amarillo), `acento` (coral), `secundario` (azul), `terciario` (índigo), `tinta` (negro), `papel` (blanco), `superficie` (gris claro). Se usan como `bg-primario`, `text-tinta`, etc.
- **Tipografía:** Onest (`font-sans`, con `next/font/google`). Escala: `text-h1`, `text-h2`, `text-h3`, `text-cuerpo`, `text-pequeno`.
- **Estilo neo-brutalista:** `--borde-marca` (2px, con `border-(length:--borde-marca)`), `rounded-marca` y `shadow-marca` (sombra dura de 4px en `tinta`).
- **Utilidades de marca:** `contorno` (borde y radio, para tarjetas), `marca` (contorno más la sombra dura) y `apretable` (el botón se "aprieta" en hover y active), definidas con `@utility` en `globals.css`.
- Las pruebas que los exigen están en `src/styles/tokens.test.ts`.

Ver [módulos](../reference/modules.md) y [superficies](../reference/surfaces.md).
