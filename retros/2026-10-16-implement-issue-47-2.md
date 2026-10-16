---
skill: implement-issue
issue: 47
pr: 58
area: api
rutas: src/lib/permisos.ts, src/lib/acceso.ts, src/app/api/imagenes/route.ts, src/lib/permisos.test.ts, docs/reference/modules.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: opus
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** Ninguno en esta ronda, que fue un relanzamiento por un hallazgo "a corregir" del revisor. Corrí en Opus aunque la definición pide Sonnet, por decisión de la persona. Para que el test de la ruta fallara en una aserción y no por un `is not a function`, el mock de `@/lib/permisos` del commit en rojo exportó también un `requerirRol` de transición que deja pasar. Lo saqué en el commit del arreglo.
**Decisiones no cubiertas:** Puse la lógica pura (`respuestaSinAcceso`) en `acceso.ts`, que ahora importa `api-error.ts`. Así queda testeable sin `@/auth`. La sesión huérfana responde 401 (`SIN_SESION`), igual que la falta de sesión. `requerirRolApi` devuelve `{ ok: false, respuesta }` y no lanza nada, para que la ruta no necesite try/catch. Mantiene el invariante de ADR-002 R-3 (el rol se relee de la base), así que el ADR queda sin cambios. Probé `permisos.ts` con `auth`, `next/server`, `next/navigation` y `usuarios` mockeados.
**Lo que encontró la revisión:** El revisor encontró lo que mi `/code-review` anterior había marcado como "no corregido": `requerirRol` en una API devuelve un 303, que `fetch` sigue y termina en un 200 con HTML. Lo había clasificado como "decisión de la persona" y no consulté en el issue. Tendría que haber comentado en #47 en ese momento para pedir la aprobación, en lugar de dejarlo en el PR. El segundo `/code-review` no encontró nada en `requerirRolApi`: sus 9 hallazgos son sobre código ya revisado o quedan fuera del alcance de la ronda. El único nuevo: `storeId` solo vale con un token OIDC. Si no hay token, el SDK usa `BLOB_READ_WRITE_TOKEN` y su store.
**Propuesta:** En implement-issue, paso 5: si un hallazgo se deja sin corregir porque toca una ruta sensible y hace falta aprobación, comentarlo en el issue y devolver `consulta` en vez de abrir el PR con la nota. Así la persona decide antes de la revisión y no después.
