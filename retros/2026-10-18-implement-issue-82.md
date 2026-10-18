---
skill: implement-issue
issue: 82
pr: 85
area: diseno
rutas: docs/development/auditorias/ui-ux-transversal.md, docs/README.md, docs/llms.txt
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-18
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** Los pasos 3 y 4 (TDD) no aplicaron porque es una auditoría solo de docs: va como "sin test" en el PR, y el check de labels lo aceptó. La primera corrida de `/code-review` como Skill fork se hizo en el checkout principal y no en el worktree, así que vio un diff vacío. Hubo que relanzarla indicando la ruta del worktree y la rama.
**Decisiones no cubiertas:** El issue pide título "en imperativo" para los issues propuestos, pero `crear-issue` exige `Auditoría <área>: <hallazgo>` con `tipo:audit`, uno por hallazgo. Usé el formato de crear-issue con el hallazgo en imperativo. `docs/README.md:58` describe una convención vieja de auditorías (`audit-<tema>-<fecha>.md`, `AUD-NN`) que los issues #80-82 contradicen. No la toqué para no pisarme con los otros dos agentes que editan esas mismas líneas, y quedó anotado para el revisor. Para Playwright instalé `playwright-core` en el scratchpad y no en el repo, así no se agregaba una dependencia; reusó el Chromium que ya estaba en caché.
**Lo que encontró la revisión:** 10 hallazgos, 9 corregidos. Usé mal 1.4.11 para el estado seleccionado (el criterio correcto es 1.4.1). Había un orden de Tab mal citado (era a 360 px, no a 1440). La propuesta de `scroll-padding` no se podía hacer desde el layout del panel. Faltaban radios y tamaños sueltos en las listas. El deshabilitado de los botones son tres casos, no dos. La tabla de issues no seguía crear-issue. Un argumento era incorrecto (`aria-hidden` no exime del contraste).
**Propuesta:** En implement-issue paso 5, para subagentes en worktree, decir explícitamente que a `/code-review` hay que pasarle la ruta del worktree (el fork corre en el cwd de la sesión principal). Para auditorías, una mini plantilla que diga qué hacer con el TDD y con el formato de títulos de issues propuestos.
