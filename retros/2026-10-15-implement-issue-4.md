---
skill: implement-issue
issue: 4
pr: 8
area: area:infra, area:web
rutas: package.json, package-lock.json, src/, vitest.config.ts, eslint.config.mjs, docs/mapa-agentes.json, AGENTS.md
fecha: 2026-10-15
skill_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
modelo: opus
rol: sesion
---
**Desvíos:** preparar.sh no tomó el issue por un `.DS_Store` sin trackear: lo excluí en `.git/info/exclude` (local) en vez de borrarlo. Los fixes de /code-review fueron de config, docs y nombres, sin test-rojo-verde (dicho en el PR). No corrí /security-review: revisé las dependencias a mano con npm audit.
**Decisiones no cubiertas:** create-next-app no corre sobre un repo con archivos: lo generé en el scratchpad y copié. `next dev` reescribe un bloque `nextjs-agent-rules` en AGENTS.md: lo commiteé para no dejar el árbol sucio. `tsc --noEmit` falla desde cero sin `next typegen` (LayoutProps): lo vi solo porque probé sin `.next`. planificar.py duplica la firma "_Abierto desde el chat…_" si el cuerpo ya la trae.
**Lo que encontró la revisión:** /code-review: sin CI de npm (alcance del #5), cn no resuelve conflictos de Tailwind, vitest con include .tsx y entorno node, eslint sin ignorar coverage/, identificador en español. Además encontré que package-lock.json no caía en `?*.lock` (sensibles).
**Propuesta:** que preparar.sh ignore los archivos del SO (.DS_Store) o que el .gitignore de la plantilla los traiga; que el mapa de la plantilla incluya package-lock.json en dependencias; que planificar.py no agregue la firma si ya está.
