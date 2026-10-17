---
skill: implement-issue
issue: 61
pr: 71
area: web
rutas: src/lib/embebible.ts, src/lib/embebible.test.ts, docs/development/architecture.md, docs/reference/modules.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno en el ciclo (rojo, commit, verde, `/code-review 71`, verificar, push). Corregí un hallazgo que el orquestador no había pedido: con un puerto fuera de rango en el host, `new URL` lanzaba. Era del propio diff, de una línea y con su test. Un test en rojo falla por el `TypeError` del bug, no por una aserción: el bug era justamente que lanzaba.
**Decisiones no cubiertas:** si seguir a Chromium o a Firefox con las fuentes con ruta: seguí a Chromium, que es el lado seguro. También, qué guardar en la caché: solo el origen final, no la URL con la query de un redirect. En Vitest no se puede probar la clave real de `use cache`: la cubrí con la firma de un argumento y con tres hosts distintos en `next start`.
**Lo que encontró la revisión:** el revisor encontró que se aceptaban fuentes con ruta, y mi test de la primera ronda decía lo contrario que el navegador. Lo había escrito de memoria de la spec, sin probarlo en Chromium. `/code-review 71` encontró que se cacheaba la URL final con la query, el comentario del modelo de amenazas viejo y la clave de caché sin normalizar. En la prueba en Chromium, un timeout en frío (1,4 s el primer fetch) mostró el camino de "desconocido".
**Propuesta:** cuando una función pura imita al navegador (cabeceras de seguridad), contrastar en Chromium los casos borde que se afirman en los tests, no solo el camino feliz.
