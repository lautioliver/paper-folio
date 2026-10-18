---
skill: implement-issue
issue: 81
pr: 83
area: panel
rutas: docs/development/auditorias/ui-ux-panel.md, docs/README.md, docs/llms.txt
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-18
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** sin TDD (issue de auditoría, solo documentación: "sin test" en el PR). La primera llamada a `/code-review origin/main...HEAD` corrió en el checkout principal (en `main`) y dio "nada para revisar": hubo que relanzarla con el nombre de la rama y la ruta del worktree.
**Decisiones no cubiertas:** la skill no tiene un camino para issues `tipo:audit` (sin código, sin rojo). La ruta y los IDs que pide el issue (`auditorias/ui-ux-panel.md`, `UX-PANEL-NN`) contradicen la convención de `docs/README.md:58` (`audit-<tema>-<fecha>.md`, `AUD-01`). No la actualicé para no chocar con los otros dos PRs paralelos que editan las mismas líneas, y lo dejé para el revisor. Agrupé los hallazgos en 13 issues propuestos, aunque `crear-issue` abre uno por hallazgo, porque el issue pedía una tabla de issues con "hallazgos que cubre".
**Lo que encontró la revisión:** 9 hallazgos de `/code-review`, todos ciertos y 8 corregidos. Tres afirmaciones técnicas eran falsas: el doble envío de una respuesta (el servidor lo impide), el foco después de un envío fallido (en demos y servicios cae al body porque el botón está dentro de los campos con `key`) y un `error.tsx` que no atrapa los errores de su propio layout. Además había una cita inventada del navegador, terminología mal ("publicar" en demos) y la tabla de issues no seguía la convención de auditorías (`Auditoría <área>:`, `tipo:audit`).
**Propuesta:** que `implement-issue` diga qué hacer con `tipo:audit`: sin rojo, verificar cada `archivo:línea` y cada afirmación de comportamiento contra el código (la mayoría de los errores fueron sobre qué hace el código, no sobre dónde está) y usar el formato de títulos de `crear-issue` en la tabla. Que el contrato pida pasarle a `/code-review` la rama y el worktree, no `origin/main...HEAD`.
