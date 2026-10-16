---
skill: implement-issue
issue: 50
pr: 67
area: area:panel
rutas: src/lib/version-formulario.ts, src/app/panel/demos/, src/app/panel/servicios/formulario.tsx, src/app/panel/proyectos/formulario.tsx, src/lib/*-admin.ts, docs/decisions/ADR-003-contenido-en-la-base.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ronda por bloqueantes del revisor. En la primera ronda no vi el bug de `<Activity>`: mi prueba en Chromium nunca editaba dos veces seguidas el mismo documento. Esta vez escribí primero la prueba en el navegador (11 fallas antes del arreglo, en los tres formularios) y después el test unitario en rojo. Un `pkill -f "node mongo.mjs"` mató mi propia shell, porque el patrón coincidía con la línea del comando; lo resolví guardando el pid. Un heredoc sin comillas expandió los backticks del cuerpo del PR y tuve que corregirlo.
**Decisiones no cubiertas:** la key es la versión del documento (`actualizadoEn`), dentro de un envoltorio con `version` obligatoria, y no `bfcacheId`: la guía de Next lo da como último recurso. En las altas, una constante: React ya resetea el formulario tras una acción que sale bien (lo comprobé en el navegador). El test de índices tiene que reconectar, porque `asegurarIndicesDe` cachea por conexión.
**Lo que encontró la revisión:** el revisor encontró el bloqueante de `<Activity>`, que también afectaba a servicios y proyectos (en main), y que faltaba `asegurarIndicesDe(Demo)`. /code-review de la ronda 2 dio 7 hallazgos y corregí 1 (la redacción del doc: la versión cambia con cualquier escritura). Descarté con pruebas los formularios de alta (no quedan con datos viejos) y que la versión no cambie en un `save()`.
**Propuesta:** sumar a lecciones.md: con `cacheComponents`, todo formulario de edición se prueba editando dos veces seguidas el mismo documento (editar, volver a la lista, editar de nuevo), en dev y en build. Y en los scripts de prueba, nunca `pkill -f` con un patrón que también aparece en el comando que lo corre.
