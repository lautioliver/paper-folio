---
skill: implement-issue
issue: 61
pr: 71
area: web
rutas: src/lib/embebible.ts, src/lib/embebible.test.ts, src/app/(sitio)/proyectos/[slug]/page.tsx, src/lib/proyectos.test.ts, docs/development/architecture.md, docs/reference/surfaces.md, docs/reference/modules.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** la primera llamada a `/code-review origin/main...HEAD` (forked) corrió en el checkout principal, no en el worktree: el rango le dio vacío y revisó el último commit de main (#68). La descarté y volví a correrla con el nombre de la rama, la ruta del worktree y los archivos en los args; esa vez revisó bien. `/security-review` lo hice a mano (el orquestador lo pidió así).
**Decisiones no cubiertas:** qué hacer si falla la consulta (elegí iframe con el aviso, cacheado por minutos), qué origen usar en un `use cache` sin request (al final, el origen del pedido pasado como argumento, con el de producción como respaldo), y si cortar el SSRF con resolución DNS (no: queda documentado como límite, porque sin fijar la IP en el fetch no sirve contra el rebinding). Para la prueba en Chromium armé una cookie de sesión de Auth.js con `encode` de `next-auth/jwt` y un AUTH_SECRET propio, más mongodb-memory-server: anduvo sin Google.
**Lo que encontró la revisión:** con `/code-review` corregí 5: el origen fijo de producción (fallaba en los previews), los nombres sin punto (`https://metadata/`), que un no-2xx decidiera `no` (los desafíos anti-bots), HEAD en vez de GET (hay CSP que solo viene en el GET) y el enlace que se escondía mientras cargaba. Además, `verificar.py` (vitest related) no corrió `src/lib/proyectos.test.ts`, que lee el `page.tsx` como texto con una regex: recién lo agarró `npm test` completo.
**Propuesta:** en implement-issue, decir que el subagente le pase a `/code-review` la rama y la ruta del worktree, no solo el rango, y que confirme en la salida qué commits revisó. En `verificar.py`, o en el mapa, mapear los `page.tsx` del sitio a los tests que leen su código fuente (`proyectos.test.ts`, `visitas.test.ts`), porque `vitest related` no los ve.
