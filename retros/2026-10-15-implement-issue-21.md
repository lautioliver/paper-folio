---
skill: implement-issue
issue: 21
pr: 26
area: area:web
rutas: src/components/sitio, src/lib/share.ts, src/lib/gsap.ts, package.json, docs/development/architecture.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-15
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el primer /code-review corrió con cwd en el checkout principal y revisó un diff vacío; hubo que repetirlo pasando la ruta del worktree en los args.
**Decisiones no cubiertas:** sin jsdom no se testean componentes; puse la lógica en `src/lib/share.ts` y verifiqué la UI con Playwright. Compartir usa `demoUrl` porque no hay página por proyecto.
**Lo que encontró la revisión:** aviso de copiado que no se borra (corregido); el resto, falsos o aceptados (flash previo a GSAP, test por texto).
**Propuesta:** que la skill diga explícitamente cómo pasar el worktree a /code-review desde un subagente.
