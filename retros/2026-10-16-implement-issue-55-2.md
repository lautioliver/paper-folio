---
skill: implement-issue
issue: 55
pr: 68
area: api, db
rutas: src/components/sitio/ContadorVisitas.tsx, src/lib/contador-visitas.ts, src/lib/visitas.ts
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno en el ciclo. Una de las guardas (RUTAS_FIJAS contra los page.tsx de (sitio)) no se puede poner en rojo contra el código correcto, así que la verifiqué con una mutación a mano y lo dije en el PR.
**Decisiones no cubiertas:** con cacheComponents, `<Activity>` conserva las refs y el estado del layout de (sitio). Mi ref contra el doble efecto de StrictMode (ronda 1) bloqueaba la vuelta desde /ingresar o /panel. No lo había probado porque mis recorridos en el navegador quedaban todos dentro de (sitio). Quedó así: en producción se cuenta cada montaje, y en desarrollo hay un dedupe con timer solo para StrictMode. Las rutas desconocidas van a la clave "otra", y los slugs válidos salen de listarProyectos, que está cacheado.
**Lo que encontró la revisión:** el revisor encontró el bug de Activity, reproducido en Chromium, y el crecimiento sin límite de rutas. El code-review de esta ronda marcó que el dedupe con timer era frágil en producción (corregido), que la clave se buscaba en serie (corregido) y que RUTAS_FIJAS no tenía guarda (corregido).
**Propuesta:** en las lecciones: con cacheComponents, los componentes de cliente que viven en un layout tienen que probarse también saliendo del grupo de rutas y volviendo (Activity conserva el estado y vuelve a montar solo los efectos).
