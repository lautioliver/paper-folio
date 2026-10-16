---
skill: implement-issue
issue: 51
pr: 64
area: panel
rutas: src/lib/proyectos-admin.ts, src/app/panel/proyectos/acciones.ts, src/app/panel/proyectos/lista.tsx, docs/reference/domain.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno. Fueron dos ciclos de test en rojo y arreglo, porque el primer arreglo tenía un hueco que encontró el `/code-review 64`.
**Decisiones no cubiertas:** cómo representar un borrado a medias. Primero usé `ok: false` con `error: "parcial"`, que obligaba a cada caso a tratarlo aparte; quedó `ok: true` con un `aviso`. El orden de borrado no cambió (primero el proyecto), porque el revisor lo había aceptado.
**Lo que encontró la revisión:** el revisor detectó que, con una falla de `Demo.deleteMany`, no se llamaba a `updateTag` y faltaba documentar en domain.md. El `/code-review` de mi propio arreglo detectó que el aviso se mostraba en la fila borrada, que se desmonta con el `refresh()`, así que el admin nunca lo veía. Lo resolví con una sola acción de borrado a nivel de lista. Sin corregir: las demos huérfanas no se pueden limpiar desde la UI, y la duplicación de `nombreDe`.
**Propuesta:** lección posible: en una lista con `useActionState` por fila, el mensaje de una acción que borra la fila se pierde al refrescar. Esas acciones van a nivel de lista.
