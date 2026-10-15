---
skill: implement-issue
issue: 6
pr: 14
area: api
rutas: src/lib/env.ts, src/lib/db.ts, src/app/api/salud/route.ts, package.json, docs/development/setup.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-15
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno de fondo. `/security-review` no se corrió (revisión manual) aunque mapa.py marcó dependencias como ruta sensible.
**Decisiones no cubiertas:** mongodb-memory-server con worktrees `--ignore-scripts`: el binario se descarga en el primer test, lo documenté en setup.md. El criterio "npm test sin red" es cierto solo desde la segunda corrida.
**Lo que encontró la revisión:** la primera corrida de `/code-review origin/main...HEAD` revisó otro repo/commit (el fork no heredó el cwd del worktree); hubo que repetirla pasando rutas absolutas y un patch. Hallazgos útiles: conexión cacheada no se reseteaba tras disconnect, carrera en el catch de la promesa, falta de log saneado en el 503. Corregidos.
**Propuesta:** en la skill, indicar que el subagente pase `git -C <worktree>` y la ruta absoluta al invocar `/code-review`.
