---
skill: implement-issue
issue: 50
pr: 67
area: area:panel
rutas: src/lib/demos-admin.ts, src/lib/demos-campos.ts, src/app/panel/demos/, src/components/panel/enlaces.ts, docs/reference/, docs/development/architecture.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** /code-review se lanzó antes de commitear los docs: por eso marcó "no hay docs" (era falso a esa altura del trabajo). Corrí rojo.sh dos veces porque el primer bloque cortaba la salida de un solo archivo de test, y una vez un test cargaba mal (indexaba un array vacío): lo arreglé con optional chaining antes del commit en rojo. Sin querer volví a correr el script de Playwright entero contra una base ya modificada y tuve que resembrarla.
**Decisiones no cubiertas:** el issue pide URL https, pero el modelo y ADR-003 R-8 aceptan http. Resolví que el panel es más estricto para las URLs nuevas, que una demo http anterior se puede editar sin tocarle la URL, y le puse logica-negocio con "ADR sin cambios" para que lo mire el revisor. El orden es por proyecto. Las huérfanas se listan aparte, sin mover. La ruta es /panel/demos/nueva (femenino, no "nuevo").
**Lo que encontró la revisión:** /code-review dio 10 hallazgos y corregí 5. La demo http anterior no se podía editar. Un id en mayúsculas rompía mover y el cambio de proyecto. Los botones de mover de las huérfanas no hacían nada. Dos consultas iban en serie. Al arreglar la URL vi un caso nuevo: una URL guardada por fuera del modelo hacía lanzar a save(). Quedaron sin tocar la concurrencia (documentada) y la duplicación con servicios (sacarla es reestructurar código compartido mientras #49 corre en paralelo).
**Propuesta:** que la skill diga que /code-review va después del commit de docs, o que se le pase la lista de commits pendientes. Un helper compartido para "mover en orden" y los utilitarios de formulario del panel (siguienteEnvio, BotonBorrar) podrían ir a un issue propio.
