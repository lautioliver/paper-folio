---
skill: implement-issue
issue: 37
pr: 44
area: panel
rutas: src/lib/bandeja.ts, src/app/panel, src/components/panel, docs/reference
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-15
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** no creé `src/proxy.ts` ni lo sumé a `/panel` (pedido del orquestador por #34). `/code-review` y `/security-review` corrieron como skills forkeadas sobre el checkout principal (diff vacío); la primera hubo que relanzarla pasando la ruta del worktree, y la segunda la hice a mano.
**Decisiones no cubiertas:** filtros inválidos se ignoran; página fuera de rango = última; módulo `bandeja.ts` aparte. Con cacheComponents, `auth()` en el layout exige `Suspense` y `connection()` (sin esto, error de crypto.getRandomValues al prerenderizar), y el costo es que 403 y redirect salen con HTTP 200.
**Lo que encontró la revisión:** 10 hallazgos; arreglé 3 (estado desconocido, página enorme, emoji cortado). Índice, doble requerirRol, aria-current: no.
**Propuesta:** el scratchpad es compartido entre agentes: usar una subcarpeta propia desde el inicio (pisé el dev.log de otro agente). Decir en la skill que /code-review y /security-review en subagentes necesitan la ruta del worktree explícita.
