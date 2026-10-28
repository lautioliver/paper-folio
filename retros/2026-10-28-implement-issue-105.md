---
skill: implement-issue
issue: 105
pr: 108
area: web
rutas: src/components/sitio, src/lib/filtro-proyectos.ts, src/lib/conteo.ts, src/styles/globals.css, src/app/(sitio)/proyectos/page.tsx
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-28
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** puse un scope inventado (sitio) en commits y en el título del PR; el CI pr-title lo rechazó y hubo que corregir el título. Los scopes válidos están en la convención §2 (web, auth, panel, api, db, diseno, infra, docs) y no los releí antes de commitear. El primer /code-review corrió en el checkout principal (diff vacío) porque la skill forkea en el cwd del orquestador: hubo que pasarle la ruta del worktree en los args.
**Decisiones no cubiertas:** vitest corre solo en node, sin jsdom: los componentes de movimiento se cubrieron con tests de fuente (patrón de gsap.test.ts) y la lógica pura con tests de comportamiento. El "contador de visitas" del issue no tiene número visible; se animó el único número público y se dejó anotado en el PR.
**Lo que encontró la revisión:** 9 hallazgos; 3 reales y corregidos: ScrollTrigger.refresh al cambiar la altura de la lista filtrada, guard de primer render frágil bajo StrictMode, parpadeo del contador. El resto descartado con motivo.
**Propuesta:** en la skill, decir que los scopes salen de la convención §2 y que /code-review de subagente necesita la ruta del worktree explícita.
