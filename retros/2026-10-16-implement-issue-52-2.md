---
skill: implement-issue
issue: 52
pr: 65
area: panel
rutas: src/app/panel/servicios/formulario.tsx, src/app/panel/servicios/tipos.ts, src/app/panel/servicios/acciones.ts
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** pusheé el arreglo (2 commits) a la rama del #63 después de que se mergeara, antes de que llegara el cambio de plan; la rama quedó con esos commits extra (sin efecto en main). El arreglo se rehizo en una rama nueva desde origin/main con cherry-pick y PR #65 (Refs #52).
**Decisiones no cubiertas:** cómo probar un componente de cliente sin jsdom: saqué lo testeable a funciones puras (valores a reponer y clave de remontaje) con test en rojo y probé el resto con Playwright contra next build + mongodb-memory-server; el e2e reprodujo el bug antes del arreglo. Para que el reset de React 19 no borre nada: controles no controlados + key que cambia con cada respuesta de la acción (envio devuelto por el servidor).
**Lo que encontró la revisión:** la autorevisión del #63 dijo que el ícono perdido estaba corregido (al alternar ícono/imagen) pero no vio el caso del reset tras un error del servidor; lo encontró el revisor en el navegador. El /code-review de esta ronda no encontró nada del arreglo; un hallazgo menor del mismo formulario (error de imagen que queda tras subir bien) quedó afuera por alcance.
**Propuesta:** en formularios con useActionState, probar en el navegador el camino "error del servidor y reintento" antes del PR, aunque haya tests de las acciones; los componentes de cliente sin jsdom son donde se escapan estos bugs. Antes de pushear una ronda extra, chequear `gh pr view <n> --json state` por si ya se mergeó.
