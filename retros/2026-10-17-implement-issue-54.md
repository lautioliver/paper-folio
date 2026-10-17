---
skill: implement-issue
issue: 54
pr: 70
area: area:db, area:auth
rutas: src/lib/accesos.ts, src/models/AccesoDiario.ts, src/lib/usuarios.ts, src/lib/fecha-metricas.ts, src/app/(sitio)/proyectos/[slug]/page.tsx
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** El primer commit rojo incluía un helper (`src/lib/caso-de-estudio.ts`) para probar la vista de detalle con mocks. Lo saqué porque rompía los tests de `proyectos.test.ts`, que miran el fuente y exigen que la página llame a `requerirSesion` con `rutaDetalle`. Lo reemplacé por un segundo commit rojo, también sobre el fuente. Así el PR tiene dos commits rojos y uno de ellos tiene un test que después se borra. Además, ese primer commit rojo llevaba también el modelo y la extracción de `fecha-metricas` (no son tests).
**Decisiones no cubiertas:** El ingreso se cuenta en `registrarIngreso` y no en el callback `jwt`, así `src/auth.ts` no cambia y se puede probar con mongodb-memory-server. La vista de detalle se cuenta con `after()`, para no demorar la página. Los admin cuentan, porque la épica no los excluye de los accesos. No dejé un servicio de lectura porque #56 define `accesosPorDia` en `metricas.ts`. Saqué la fecha a `fecha-metricas.ts` para que el flujo de auth no importe `contenido.ts` (`use cache`).
**Lo que encontró la revisión:** `/code-review` encontró 10 hallazgos y corregí 2: un `find` sin `sort` en un test que cruza la medianoche y un alias que nadie usaba. Los otros quedaron explicados en el PR: escrituras no atómicas, re-render que cuenta otra vista, latencia en el ingreso, E11000 en el upsert (falso en Mongo 4.2+) y test por regex.
**Propuesta:** Que `implement-issue` sugiera, antes de escribir el rojo, buscar los tests que leen el fuente de la página que se va a tocar (`readFileSync` sobre `page.tsx`). Restringen dónde puede vivir la lógica.
