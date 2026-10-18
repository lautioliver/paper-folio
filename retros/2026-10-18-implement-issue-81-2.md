---
skill: implement-issue
issue: 81
pr: 83
area: panel
rutas: docs/development/auditorias/ui-ux-panel.md, docs/README.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-18
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ronda de correcciones después de la revisión, sin bloqueantes y aprobada por la persona. Sin ciclo rojo/verde: solo documentación.
**Decisiones no cubiertas:** cómo citar un documento hermano que todavía no existe en la rama (ui-ux-transversal.md, PR #85). `check-docs.py` rechaza la ruta entre backticks, así que la puse como texto plano. Cuál de las auditorías paralelas es dueña de cada hallazgo duplicado: lo decidió el orquestador, no la skill. Para el índice copié el formato de #84 (sub-viñeta) y no inventé uno propio.
**Lo que encontró la revisión:** dos afirmaciones mías eran falsas en el navegador. En UX-PANEL-25 dije "sin borde cortado", y el chip sí queda cortado. En UX-PANEL-06 dije que el foco queda en el botón de proyectos, y cae al body porque el botón se deshabilita mientras corre la acción. Sin navegador, inferí comportamiento de render y de foco desde el código, y me equivoqué en las dos. También faltaban matices de reglas (respondida → en_curso es válido) y el alcance de forbidden.tsx y generateMetadata.
**Propuesta:** en las auditorías desde el código, no afirmar nada sobre el foco ni el render. Marcarlo como hipótesis, o pedir que lo verifique el revisor con navegador. Y cuando hay auditorías en paralelo, que el orquestador reparta de entrada quién es dueño de los temas comunes (contraste, foco, metadata), para evitar la ronda de deduplicación.
