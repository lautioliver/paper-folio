---
skill: implement-issue
issue: 66
pr: 72
area: api, panel
rutas: src/lib/respuestas.ts, src/lib/seguimiento.ts, src/app/panel/consultas/[id]/acciones.ts, package.json
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** la primera corrida de `/code-review origin/main...HEAD` (Skill, ejecución forkeada) revisó el checkout principal y no el worktree: `HEAD` era main y el diff salió vacío. La relancé con el nombre de la rama y la ruta del worktree en los args y ahí sí revisó el diff. Junté la baja de la dependencia en el commit del fix y después lo partí con `reset --soft`.
**Decisiones no cubiertas:** el issue pedía solo "dejar pendiente". La autorevisión mostró que, sin completar el envío tardío, el segundo email solo se postergaba 2 min, así que agregué que se complete al terminar (con `after` en la acción). Es un poco más que el texto aprobado, pero va en la misma dirección; lo dije en el PR para el revisor. Puse `logica-negocio` aunque el issue no lo traía, porque cambia la regla documentada en domain.md.
**Lo que encontró la revisión:** pasada 1: el envío tardío nunca se registraba, el fallo tardío se tragaba y el mensaje decía un estado viejo. Pasada 2: un test dependía de tiempos, el timeout se detectaba por el string del código, el log decía "no se pudo enviar" tras un timeout y el resultado tardío sin registrar no quedaba en el log. Quedaron sin corregir, y explicados en el PR, el envío de más de 2 min, el `maxDuration` y la consulta borrada durante el timeout.
**Propuesta:** en el contrato o en implement-issue paso 5, decir explícitamente que un subagente en worktree le pasa a `/code-review` el nombre de la rama (no `HEAD`), porque el fork corre en el cwd del checkout principal.
