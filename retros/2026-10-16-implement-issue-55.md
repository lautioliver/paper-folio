---
skill: implement-issue
issue: 55
pr: 68
area: api, db
rutas: src/lib/visitas.ts, src/app/api/visitas/route.ts, src/models/VisitaDiaria.ts, src/models/VisitanteDiario.ts, src/components/sitio/ContadorVisitas.tsx, src/app/(sitio)/layout.tsx, src/lib/sesion.ts
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** `/code-review origin/main...HEAD` y `/security-review`, lanzados con la herramienta Skill desde el subagente, corrieron sobre el checkout principal (en main, sin cambios), no sobre el worktree. El primer code-review revisó el último commit de main (#62) y el security-review recibió un diff vacío. Repetí el code-review pasándole la rama y la ruta del worktree en los args, y así sí revisó el diff. El security-review lo hice a mano sobre `git -C <worktree> diff`.
**Decisiones no cubiertas:** el layout nuevo `(sitio)/layout.tsx` como lugar para el contador. `usePathname` dentro de Suspense por cacheComponents. Una ref contra el doble efecto de StrictMode. El rol de admin releído de la base (`rolDeLaSesion` en sesion.ts) en lugar del token. Un regex de ruta interna con forma de slug. `/cuenta` cuenta. 415 si no es JSON. Para el prefetch, probé en un navegador real que no cuenta.
**Lo que encontró la revisión:** se leía la sesión y la base antes de descartar a los bots (corregido). El regex de bots tomaba por bots a los navegadores dentro de Discord y Telegram (corregido). Quedaron en el PR sin corregir: no hay límite contra el inflado, las rutas de slugs inexistentes crean documentos y `/cuenta` cuenta.
**Propuesta:** que implement-issue o el contrato digan que, desde un subagente, `/code-review` y `/security-review` reciben la rama y la ruta del worktree en los args, porque corren en el cwd del orquestador. Sumar `src/app/**/layout.tsx` al mapa de docs: check-docs avisó que no lo cubre.
