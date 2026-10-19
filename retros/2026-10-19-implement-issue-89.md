---
skill: implement-issue
issue: 89
pr: 99
area: web
rutas: src/app/not-found.tsx, src/app/error.tsx, src/app/global-error.tsx
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-19
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
## Qué salió bien
Los tests renderizan los componentes con renderToStaticMarkup en un .test.ts (vitest solo incluye .ts, sin jsdom).

## Desvíos
- El primer /code-review corrió en el checkout principal (sin cambios) y devolvió vacío; hubo que pasarle la ruta del worktree explícita.
- Next 16 usa `retry` (además de `reset`) en error.tsx: el issue decía `reset()`; seguí la guía local.
- El code-review detectó un `main` anidado en el panel (PanelShell ya tiene uno): corregido.

## Sugerencia
Que la skill avise que /code-review en subagentes necesita la ruta del worktree en los args.
