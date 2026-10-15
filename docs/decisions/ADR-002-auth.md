# ADR-002 — Auth.js v5 con Google, sesión JWT y roles por email

## Estado

Aceptado (2026-10-15)

Origen: épica #31 (hito 3), decisiones 1 a 3, aprobadas por @lautioliver en el chat. Implementado en #32.

## Contexto

La consigna pide registro obligatorio para ver el detalle de proyectos y demos (sección A), y un rol de operador y otro de administrador para gestionar el sitio (secciones B y 4). El ADR-001 R-3 eligió Auth.js con Google. Al implementarlo, Auth.js v5 (el que soporta el App Router) seguía publicado como beta (`5.0.0-beta.32`).

## Decisión

1. **R-1. Auth.js v5 (`next-auth@5.0.0-beta.32`, versión fija) con Google como único proveedor.** Solo se aceptan cuentas con el email verificado por Google. La configuración vive en `src/auth.ts`, y es perezosa: las variables (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) se validan al primer uso, así `next build` no las exige.
2. **R-2. Sesión JWT, sin adaptador de base.** Al ingresar, `registrarIngreso` (`src/lib/usuarios.ts`) crea o actualiza el documento en `usuarios`. El token lleva `id` y `rol`.
3. **R-3. El rol de la base manda.** Para permisos, `requerirRol` (`src/lib/permisos.ts`) relee el rol de `usuarios` en cada página o acción protegida. El rol del token es solo para la UI, como mostrar u ocultar "Panel". Proteger algo solo en la UI o solo en `proxy.ts` no cuenta.
4. **R-4. Roles por email hasta el hito 5:**
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
- Cambiar el rol de alguien hoy es editar `ADMIN_EMAILS` u `OPERADOR_EMAILS` en Vercel y que esa persona vuelva a ingresar. El panel del admin del hito 5 lo reemplaza, y ahí habrá que enmendar R-4.
- `authInterrupts` es experimental en Next 16. Si cambia, se reemplaza `forbidden()` por una respuesta 403 propia.
