# ADR-002 — Auth.js v5 con Google, sesión JWT y roles por email

## Estado

Aceptado (2026-10-15). R-4 enmendada el 2026-10-15 por #49 (ver "Enmienda 2026-10-15" al final).

Origen: épica #31 (hito 3), decisiones 1 a 3, aprobadas por @lautioliver en el chat. Implementado en #32.

## Contexto

La consigna pide registro obligatorio para ver el detalle de proyectos y demos (sección A), y un rol de operador y otro de administrador para gestionar el sitio (secciones B y 4). El ADR-001 R-3 eligió Auth.js con Google. Al implementarlo, Auth.js v5 (el que soporta el App Router) seguía publicado como beta (`5.0.0-beta.32`).

## Decisión

1. **R-1. Auth.js v5 (`next-auth@5.0.0-beta.32`, versión fija) con Google como único proveedor.** Solo se aceptan cuentas con el email verificado por Google. La configuración vive en `src/auth.ts`, y es perezosa: las variables (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) se validan al primer uso, así `next build` no las exige.
2. **R-2. Sesión JWT, sin adaptador de base.** Al ingresar, `registrarIngreso` (`src/lib/usuarios.ts`) crea o actualiza el documento en `usuarios`. El token lleva `id` y `rol`.
3. **R-3. El rol de la base manda.** Para permisos, `requerirRol` (`src/lib/permisos.ts`) relee el rol de `usuarios` en cada página o acción protegida. El rol del token es solo para la UI, como mostrar u ocultar "Panel". Proteger algo solo en la UI o solo en `proxy.ts` no cuenta.
4. **R-4. Roles por email hasta el hito 5** (reemplazada por la enmienda de abajo):
   - Todo usuario nuevo es `usuario`.
   - `ADMIN_EMAILS` da `admin` y `OPERADOR_EMAILS` da `operador`. Son listas separadas por comas, solo en el entorno y nunca en el repo.
   - El rol se recalcula en cada ingreso y **también al leerlo** (`buscarRol`): sacar a alguien de la lista le quita el rol aunque su sesión siga viva.
5. **R-5. Sin permiso, 403 con `forbidden()`.** Usa `experimental.authInterrupts` de Next 16 y la página `src/app/forbidden.tsx`. Sin sesión, se redirige a `/ingresar?callbackUrl=…`, solo con rutas internas (`rutaInterna`). Si el token es válido pero el usuario ya no existe en la base, se agrega `&error=sesion` para que `/ingresar` no lo devuelva a la página.

## Alternativas descartadas

- **Better Auth 1.7** — es estable y trae un plugin de roles, pero cambia el ADR-001 y suma su propio esquema de tablas. Con el plazo de la exposición, se priorizó lo que ya estaba decidido y documentado.
- **Auth.js v4 (estable)** — no está pensado para el App Router de Next 16.
- **Sesiones en base con `@auth/mongodb-adapter`** — suma otra dependencia y otra conexión (el driver nativo, además de Mongoose), sin una ventaja para este volumen.

## Consecuencias

- Depende de una beta: se fija la versión exacta y se actualiza solo con un PR que lo diga.
- ~~Cambiar el rol de alguien hoy es editar `ADMIN_EMAILS` u `OPERADOR_EMAILS` en Vercel y que esa persona vuelva a ingresar.~~ Desde la enmienda, el rol se cambia en `/panel/usuarios` y vale en el próximo pedido.
- Con `cacheComponents`, la guarda (`requerirSesion` / `requerirRol`) corre dentro de `Suspense`: la redirección de la página y el 403 de `forbidden()` viajan en el stream con HTTP 200. El contenido protegido nunca se envía; el 307 real sin sesión lo da `proxy.ts`. Por eso las guardas llaman a `connection()` antes de leer la sesión (Auth.js usa `crypto.getRandomValues` en cada `auth()` y Next lo loguea como error si la ruta parece prerenderizable).
- `authInterrupts` es experimental en Next 16. Si cambia, se reemplaza `forbidden()` por una respuesta 403 propia.

## Enmienda 2026-10-15 — roles desde el panel (#49)

Origen: épica #46, decisión 4. Aprobada por @lautioliver en el chat y en el issue: https://github.com/lautioliver/paper-folio/issues/49#issuecomment-6223816750. El plan de migración de abajo (`normalizarLegados()` y `ADMIN_EMAILS` sumado al leer sin guardarse) lo aprobó aparte: https://github.com/lautioliver/paper-folio/issues/49#issuecomment-6224450832.

**R-4 (nueva). El rol vive en `usuarios` y lo asigna el admin en `/panel/usuarios`:**

- Todo usuario nuevo es `usuario`. El ingreso no toca el rol guardado.
- Los emails de `ADMIN_EMAILS` son `admin` siempre: el panel no los degrada ni los bloquea. Ese admin **no se guarda**: `buscarRol` lo suma al leer, así sacar un email de la lista le quita el admin aunque su sesión siga viva (vuelve a su rol guardado).
- `OPERADOR_EMAILS` deja de usarse: el operador se asigna desde el panel.
- **Bloquear** una cuenta (`bloqueado: true`) impide el ingreso (el callback `signIn` la niega y la manda a `/ingresar?error=bloqueado`; si la base no responde, también niega, con `error=verificacion`) y, como R-3 relee la base en cada permiso, corta sus sesiones abiertas: `evaluarAcceso` da el motivo `bloqueado` (las páginas redirigen a `/ingresar?…&error=bloqueado`, las APIs responden `403 CUENTA_BLOQUEADA`).
- Un admin no se cambia el rol ni se bloquea a sí mismo, y el sitio nunca se queda sin ningún admin vigente: no se le quita el rol ni se bloquea al último (contando los de `ADMIN_EMAILS`). Las reglas están en `revisarCambio` (`src/lib/acceso.ts`).

**Datos de antes.** Hasta esta enmienda el `rol` guardado se recalculaba con las dos listas en cada ingreso, y no valía al leer: un documento viejo puede tener el rol de alguien que salió de una lista y no volvió a ingresar. Esos documentos no tienen `bloqueado`, y no se les cree el rol: valen `usuario` (más `ADMIN_EMAILS`) y se normalizan a `usuario` al ingresar o al abrir el panel. Quien era `operador` por `OPERADOR_EMAILS` lo tiene que volver a recibir desde el panel.

**Consecuencias.** Revertir la enmienda vuelve a R-4 original: los roles asignados desde el panel y los bloqueos se ignoran (los campos quedan en la base sin uso). Dos admins que se quitan el rol entre sí al mismo tiempo podrían pasar el chequeo los dos (no hay transacción): si después de escribir no queda ningún admin, el cambio se deshace.
