---
skill: implement-issue
issue: 48
pr: 60
area: area:web, area:db
rutas: scripts/seed-contenido.ts, src/lib/seed-contenido.ts, src/lib/seed-contenido.test.ts, docs/development/setup.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: opus
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno. Fue una ronda de un solo hallazgo del revisor, con TDD (bd53e1f en rojo, 4deb2ef verde).
**Decisiones no cubiertas:** cómo cerrar el riesgo de escribir en otra base. Elegí tres cosas: el archivo pisa la shell (`util.parseEnv`), se imprime host y base, y se rechaza Atlas sin `--atlas`. El segundo /code-review trajo 10 hallazgos sobre todo el PR y no sobre el cambio. No los toqué porque el pedido era un solo cambio, y anoté dos nuevos (strings vacíos en el modelo Proyecto, `required` con `this` en update validators de Servicio) para el revisor.
**Lo que encontró la revisión:** el revisor detectó que `process.loadEnvFile` no pisa variables ya exportadas. Mi CLI test del seed no lo cubría porque corría con un entorno limpio, y setup.md decía lo contrario.
**Propuesta:** lección: "`process.loadEnvFile` / `--env-file` de Node no pisan variables ya definidas; en scripts que escriben en una base, que el archivo mande o fallar, y testear con la shell cargada con otro valor".
