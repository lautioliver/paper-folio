# Módulos — Paperfolio

> Dónde vive cada cosa en el código y qué es responsable de qué.

| Módulo | Responsable de |
|---|---|
| `src/lib/site.ts` | Datos del sitio (`siteConfig`: nombre y descripción) para la metadata y la UI |
| `src/lib/cn.ts` | `cn()`: une clases y descarta las vacías (clases condicionales). No resuelve conflictos de Tailwind (`px-4` y `px-0` quedan las dos) |
| `src/lib/share.ts` | `shareOrCopy()` (Web Share API con caída a copiar el link) y `copyText()` (Clipboard API); no lanzan, devuelven el resultado para que la UI avise |
| `src/lib/gsap.ts` | Registra `ScrollTrigger` y exporta `gsap` y `MOTION_OK` (la consulta de reduced-motion para `gsap.matchMedia`); solo para componentes de cliente |
| `src/lib/env.ts` | Valida con Zod las variables del servidor (`MONGODB_URI`, `MONGODB_DB`; `IP_HASH_SAL` aparte con `leerIpHashSal()`, y `RESEND_API_KEY` con `CONTACTO_EMAIL_DESTINO` con `leerEmailConfig()`, para que la base no las exija) y las expone tipadas (`env`, `leerEnv()`). Los errores nombran la variable, nunca el valor |
| `src/lib/db.ts` | `conectar()`: conexión de Mongoose cacheada en `globalThis`; `desconectar()` la cierra (para tests). Nunca loguea la URI |
| `src/models/Consulta.ts` | Modelo Mongoose de la colección `consultas` (ver [domain.md](domain.md)) |
| `src/app/api/consultas/route.ts` | `POST /api/consultas`: lee la IP, llama a `crearConsulta` y traduce el resultado a HTTP |
| `src/lib/api-error.ts` | `respuestaError(status, codigo, mensaje, extra?)` y `respuestaConfiguracionInvalida()`: el formato único de error de la API (`/api/salud` y `/api/consultas`) |
| `src/lib/ip.ts` | `leerIp(headers)`: primer valor de `x-forwarded-for` o `x-real-ip`; vacío si no hay |
| `src/lib/consultas.ts` | `crearConsulta(input, { ip, avisar? })`: valida con `parseContactRequest`, descarta si el campo trampa `sitio_web` trae algo (antes de validar), corta con `limite` al llegar a 5 consultas por hora del mismo `ipHash` y guarda. Devuelve `creada`, `invalida` (errores por campo), `limite` o `descartada`; lanza un error si la `ip` viene vacía. Tras guardar llama a `avisar(consulta)` (por defecto `avisarConsultaNueva`): si sale bien marca `emailEnviado: true`; si falla, la consulta queda con `emailEnviado: false`, se loguea solo el nombre del error y igual devuelve `creada` |
| `src/lib/bandeja.ts` | `parsearFiltros(searchParams)` valida con Zod (lo inválido se descarta; ceros a la izquierda en `pagina` no cuentan) y `listarConsultas({ tipo?, estado?, pagina })` recibe esos filtros ya validados (la página fuera de rango devuelve la última válida, mínimo 1). Devuelve `{ items, total, paginas, pagina }` de a 20, con campos explícitos (`id`, `nombre`, `tipo`, `estado`, `extracto`, `creadaEn`): `ipHash` y `email` no salen de ahí. Crea los índices de `consultas` (`asegurarIndicesDe`). Reexporta `ESTADOS_CONSULTA` y sus etiquetas |
| `src/lib/estados-consulta.ts` | Módulo puro (sin base; lo usan el modelo, la bandeja y el cliente): `ESTADOS_CONSULTA`, `ETIQUETAS_ESTADO`, `TRANSICIONES`, `esEstadoConsulta`, `esTransicionValida(desde, hacia)` y `origenesDe(estado)` |
| `src/lib/seguimiento.ts` | `obtenerConsulta(id)`: el detalle para el panel (con el `email`, sin `ipHash`) y el historial con el nombre de cada autor; `null` si el id no es un ObjectId de 24 hex o no existe. `cambiarEstado(id, estado, autor)` y `agregarNota(id, texto, autor)` validan con Zod y escriben con un solo `updateOne` (estado + entrada en el seguimiento); devuelven `{ ok: true }` o `{ ok: false, error: "no-encontrada" \| "transicion-invalida" \| "invalida", mensaje }` y lanzan si el `autor` no es un id (sale de la sesión) |
| `src/app/panel/consultas/[id]/` | Detalle de una consulta: `page.tsx` (Suspense), `detalle.tsx` (`requerirRol` y después `obtenerConsulta`; 404 si no existe), `controles.tsx` (cliente, `useActionState`), `acciones.ts` (server actions `cambiarEstadoAccion` y `agregarNotaAccion`, con `requerirRol` cada una y el autor de la sesión) |
| `src/app/panel/layout.tsx` | Guarda del shell del panel (no de las páginas: cada página y acción llama a `requerirRol` antes de leer datos): `requerirRol("/panel/consultas", "operador", "admin")` dentro de `Suspense` (`auth()` lee cookies) y `PanelShell` (`src/components/panel/`): barra lateral desde 1024 px, barra inferior en celular |
| `src/lib/email.ts` | `avisarConsultaNueva(consulta, cliente?)`: manda con Resend, desde `onboarding@resend.dev` a `CONTACTO_EMAIL_DESTINO`, un texto plano con asunto `Nueva consulta (<tipo>) de <nombre>` y el email del visitante como `replyTo`. El cliente se inyecta para testear; lanza si falta la config o si Resend responde con error |
| `src/app/api/salud/route.ts` | `GET /api/salud`: health check de la base (ping) |
| `src/components/Container.tsx` | Ancho máximo y márgenes laterales de las secciones |
| `src/lib/contact.ts` | `parseContactRequest()`: valida la consulta del formulario (nombre, email, tipo `general`/`cotizacion`/`asesoria`, mensaje de 10 a 2000 caracteres) y devuelve un error por campo |
| `src/content/profile.ts` | Datos del PoC: perfil, stack, servicios, proyectos (cada uno con su `caso` de estudio: problema, solución, funcionalidades y stack) y trayectoria, con datos públicos de GitHub |
| `src/components/sitio/` | Secciones de la landing (`Sections.tsx`, `Contact.tsx`), `Navbar` (menú de celular: inerte afuera, Escape, se cierra en PC; recibe la sesión como slot), `CuentaBarra` y `MenuCuenta` (Ingresar o avatar con menú: Mi cuenta, Panel, Salir), `StackBand` (banda con pausa), `ContactForm`, `Reveal` (entrada con GSAP ScrollTrigger; sin JS o con reduced-motion se ve fijo), `HeroMotion`, `ShareButton` y `CopyProfileLink`, `Highlight` y `SectionTitle`, `tones.ts` (clases de color por tono) e ilustraciones SVG con tokens |
| `src/auth.ts` | Auth.js v5 con Google y sesión JWT (`handlers`, `auth`, `signIn`, `signOut`). Registra al usuario al ingresar. Ver ADR-002 |
| `src/models/Usuario.ts` | Modelo de `usuarios` y la lista de roles (`ROLES`) |
| `src/lib/usuarios.ts` | `rolParaEmail()`, `registrarIngreso()` (upsert por email con el rol según `ADMIN_EMAILS` y `OPERADOR_EMAILS`) y `buscarRol()` (rol vigente, recalculado con esas listas) |
| `src/lib/acceso.ts` | `evaluarAcceso()`: decide si una sesión alcanza para unos roles, releyendo el rol de la base (`sin-sesion`, `sin-permiso`, `sesion-huerfana`), `rutaInterna()` y `urlDeIngreso()` (la URL de `/ingresar?callbackUrl=…`). Lógica pura, sin Next |
| `src/lib/ingreso.ts` | `decidirIngreso({ sesion, error, callbackUrl })` (redirigir o mostrar /ingresar; el `callbackUrl` pasa por `rutaInterna`) y `puedeVerPanel(rol)` (solo UI). Lógica pura |
| `src/lib/sesion.ts` | `sesionParaLaBarra()` (token, sin base; `null` sin sesión o sin variables `AUTH_*`) y `estadoDeSesion()` (`ninguna`, `valida` o `huerfana`, releyendo el rol de la base) |
| `src/lib/sesion-acciones.ts` | Server actions `ingresarConGoogle`, `salir` y `salirEIngresarDeNuevo` |
| `src/lib/permisos.ts` | `requerirSesion(volverA)` y `requerirRol(volverA, rol, ...otros)` (al menos un rol) para páginas y server actions: redirigen a `/ingresar` o responden 403 (`forbidden()`) |
| `src/proxy.ts` | Proxy de Next 16: redirige a `/ingresar?callbackUrl=…` si no hay sesión en las rutas protegidas (hoy `/proyectos/:path+`). Solo adelanta la redirección; el control real es `requerirSesion` en cada página |
| `src/lib/proteccion.ts` | `redireccionDeProxy(pathname, haySesion)` y `PREFIJOS_PROTEGIDOS`: la decisión del proxy, pura y testeable |
| `src/lib/proyectos.ts` | `buscarProyecto(slug)`, `rutaDetalle(slug)` y `RUTA_PROYECTOS` |

