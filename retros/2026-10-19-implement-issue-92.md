---
skill: implement-issue
issue: 92
pr: 102
area: panel
rutas: src/app/panel/demos, src/app/panel/servicios, docs/development/architecture.md, docs/reference/surfaces.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-19
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno. Los componentes cliente quedaron sin test (no hay entorno de DOM); lo dije en el PR.
**Decisiones no cubiertas:** un useActionState único por lista con un despachador cliente (campo accion) en vez de uno por acción, para que haya un solo mensaje y un solo estado ocupado. Las acciones pasan de argumentos enlazados a campos de formulario.
**Lo que encontró la revisión:** un sed con glob sobre acciones.test.ts tocó también el test de proyectos (fuera de alcance; lo detectó /code-review y lo revertí). Quedó sin corregir que el proveedor del aviso no se monta con la lista vacía. El resto fue duplicación y temas de otros issues.
**Propuesta:** ninguna.
