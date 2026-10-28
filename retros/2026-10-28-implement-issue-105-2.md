---
skill: implement-issue
issue: 105
pr: 108
area: sitio
rutas: src/components/sitio, src/styles/globals.css, src/lib/seccion-activa.ts, docs
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-28
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno relevante. El primer /code-review corrió en el checkout principal (cwd reiniciado) y dio vacío; hubo que repetirlo indicando el worktree.
**Decisiones no cubiertas:** clip-path (no transform) para pintar el marcador, porque el texto blanco sobre blanco quedaría invisible con un fondo animado; la banda del stack ya era marquesina.
**Lo que encontró la revisión:** flotación sin pausa fuera de pantalla, delay del marcador, resize en la navbar.
**Propuesta:** que la skill avise que /code-review en un worktree necesita el diff con `git -C`.
