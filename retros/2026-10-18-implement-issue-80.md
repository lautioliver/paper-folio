---
skill: implement-issue
issue: 80
pr: 84
area: area:diseno, area:web
rutas: docs/development/auditorias/ui-ux-sitio.md, docs/README.md, docs/llms.txt
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-18
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** sin tests ni rojo.sh (auditoría, solo docs; "sin test: solo documentación" en el PR, el check de labels lo aceptó). El primer `/code-review origin/main...HEAD` lanzado con Skill corrió en el checkout principal (cwd del orquestador) y no vio nada; hubo que pushear y pasarle la rama remota y la ruta del worktree. Además, esa corrida dejó el worktree en `origin/main` (HEAD separado): lo noté porque el archivo "desapareció" y volví a la rama antes de seguir.
**Decisiones no cubiertas:** el issue pedía títulos en imperativo y la convención de auditorías pide `Auditoría <área>: <hallazgo>`: usé los dos ("Auditoría UI sitio: <imperativo>"). El issue nombraba `src/app/globals.css`, pero los tokens están en `src/styles/globals.css`. `docs/README.md` tenía otra convención de nombres de auditoría (`audit-<tema>-<fecha>`, `AUD-NN`): la puse al día. `check-docs.py` marca como rotas las rutas entre backticks que no existen, y una auditoría habla justo de archivos que faltan (`not-found.tsx`): hubo que escribirlas sin la ruta completa.
**Lo que encontró la revisión:** 10 hallazgos de `/code-review`, todos ciertos y corregidos: UX-SITIO-02 sobrestimado (la landing usa "use cache" con cacheComponents, un error ahí no llega a runtime), una cita de línea equivocada (/ingresar:20-26 es "no configurado", no la base caída), voz mezclada más amplia de lo dicho, issues que tocan sesiones sin `area:auth` ni aviso de consulta, `template` con el nombre copiado a mano, un email en el pie que no existe, una propuesta de "volver" que no funcionaba para la landing y un valor suelto (`border-[3px]`) en una propuesta que pedía tokens.
**Propuesta:** en el contrato o en implement-issue, decir que `/code-review` lanzado con Skill desde un subagente corre en el cwd del orquestador: pasarle siempre la rama remota y la ruta del worktree, y comprobar después con `git branch --show-current` que el worktree sigue en la rama. Para auditorías, una nota en implement-issue: verificar con el código cada afirmación sobre el comportamiento en runtime (caché, prerender), no solo los archivo:línea.
