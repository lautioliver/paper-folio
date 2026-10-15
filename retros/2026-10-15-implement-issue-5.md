---
skill: implement-issue
issue: 5
pr: 12
area: infra
rutas: .github/workflows/ci.yml, docs/development/setup.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-15
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno. Sin test (config de CI); el criterio de rojo se probó en local con archivos temporales no commiteados.
**Decisiones no cubiertas:** el issue pide `npm ci` simple aunque los worktrees usan `--ignore-scripts`; seguí el issue. No hay forma de esperar a un code-review en background sin Monitor: hubo que sondear.
**Lo que encontró la revisión:** la primera corrida de /code-review revisó el checkout principal (diff vacío) porque corre en el cwd del orquestador; hubo que repetirla indicando el worktree. Hallazgo útil: faltaban timeout y concurrency (corregido).
**Propuesta:** en el contrato, decir cómo correr /code-review desde un worktree (pasar la ruta en args).
