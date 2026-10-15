---
skill: implement-issue
issue: 34
pr: 43
area: auth
rutas: src/proxy.ts, src/lib/proteccion.ts, src/lib/acceso.ts, src/lib/permisos.ts, src/app/(sitio)/proyectos, src/content/profile.ts, src/components/sitio/Sections.tsx
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-15
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno grave. Probé el flujo con sesión sin Mongo local: quité `requerirSesion` solo en local para ver el render y lo revertí.
**Decisiones no cubiertas:** (1) con `NextAuth(() => cfg)` perezoso, `auth(callback)` devuelve una promesa, así que `export default auth(...)` rompe el proxy ("must export a function"); hay que esperarla dentro de `proxy`. (2) Con `cacheComponents` la página con sesión va en `Suspense` y el 404 sale con HTTP 200. (3) Los "Ver demo" de la landing siguen públicos.
**Lo que encontró la revisión:** `/code-review` y `/security-review` se lanzaron con cwd en el checkout principal y vieron el diff vacío: hubo que pasarles el worktree en los args (y el segundo no lo respetó; revisé a mano). El scratchpad es compartido entre subagentes en paralelo: `dev.log` pisado por otro agente; usar un subdirectorio propio.
**Propuesta:** en la skill, decir que `/security-review` toma el diff del cwd y que en subagentes hay que correrla desde el worktree o revisar a mano; y que los archivos del scratchpad van en un subdirectorio por issue.
