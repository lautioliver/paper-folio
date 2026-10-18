---
skill: implement-issue
issue: 80
pr: 84
area: area:diseno, area:web
rutas: docs/development/auditorias/ui-ux-sitio.md, docs/README.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-18
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno en la ronda de corrección (solo docs, sin test).
**Decisiones no cubiertas:** el orquestador pidió un hallazgo nuevo de foco sobre primario, pero la auditoría transversal ya lo tenía (UX-TRANS-04). Lo agregué como UX-SITIO-21, con el caso concreto de la página, marcado como cubierto y fuera de la tabla, igual que el resto de los duplicados. No enlacé el documento de la transversal porque todavía no está en main: lo cité como texto plano, sin backticks, porque `check-docs.py` marca como rotas las rutas inexistentes entre backticks.
**Lo que encontró la revisión:** dos errores sobre el comportamiento en runtime que se me pasaron. `sesionParaLaBarra` ya atrapa sus errores, así que el ejemplo del primer borrador no podía pasar, y quedó afuera el caso real: `buscarRol`, que se llama sin try/catch. También faltaba medir el contraste del foco sobre primario. Además, dos issues mezclaban trabajo libre con trabajo de auth, y una de las tres auditorías paralelas duplicaba temas de las otras.
**Propuesta:** cuando hay auditorías en paralelo (una de página y una transversal), que el orquestador pase desde el principio qué temas son de cuál, así no hay que hacer una ronda solo para marcar duplicados. En una auditoría, medir el contraste del foco contra todos los fondos de la paleta que tengan controles encima, no solo contra papel y tinta.
