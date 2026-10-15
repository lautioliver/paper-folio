---
skill: implement-issue
issue: 32
pr: 41
area: area:auth, area:db
rutas: src/auth.ts, src/lib/permisos.ts, src/lib/acceso.ts, src/lib/usuarios.ts, src/models/Usuario.ts, src/lib/env.ts, src/lib/db.ts, next.config.ts
fecha: 2026-10-15
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
modelo: opus
rol: sesion
---
**Desvíos:** la aprobación de Autonomía (dependencia beta, schema, auth) fue en el chat, sin comentario en el issue. leerAuthConfig/leerAuthRoles entraron sin rojo previo (tests después de la implementación, declarado en el PR).
**Decisiones no cubiertas:** importar `@/auth` en Vitest rompe (next-auth no resuelve next/server): la lógica pura se separó en acceso.ts y los envoltorios de Next quedaron sin test unitario. forbidden() requiere experimental.authInterrupts en Next 16. Un `next dev` previo (PID ajeno o huérfano de una prueba mía) bloqueó un segundo dev en el mismo checkout; probé en un worktree aparte. "requerirRol sin roles" se cubrió con un archivo de chequeo de tipos (@ts-expect-error) en vez de un test.
**Lo que encontró la revisión:** /code-review: el rol no se revocaba hasta reingresar (grave: "el rol de la base manda" no sirve si la base no se recalcula), sesión huérfana en loop con /ingresar, requerirRol abierto sin roles, callbackUrl sin validar, falta de log, índices duplicados, `new` deprecado, test que podía no afirmar. /security-review: sin hallazgos; sumé rechazar caracteres de control en rutaInterna.
**Propuesta:** que la skill implement-issue diga cómo testear wrappers de Next (auth/redirect) — p. ej. separar lógica pura siempre — y que pkill de next dev en las pruebas use el árbol de procesos (next-server queda huérfano).
