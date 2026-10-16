---
skill: implement-issue
issue: 39
pr: 59
area: area:panel, area:db
rutas: src/lib/estados-consulta.ts, src/lib/seguimiento.ts, src/lib/consultas.ts, src/app/panel/consultas/[id]/acciones.ts, docs/reference/domain.md, docs/reference/modules.md, docs/development/architecture.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: opus
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ronda de corrección pedida por el orquestador tras la revisión del PR, limitada a tres cambios; corrió en Opus (la definición dice sonnet). No hizo falta traer main (sin commits nuevos). `/code-review 59` corrió después del push, porque se revisa por número de PR.
**Decisiones no cubiertas:** un test de "índice que falla" reproducía el bug con una promesa rechazada sin aserción explícita; `rojo.sh` lo contaba como rojo igual. Lo reescribí con `resolves.toMatchObject` para que la falla sea una AssertionError. Verifiqué con `gh api` que la aprobación del cambio de regla es un comentario de @lautioliver (OWNER).
**Lo que encontró la revisión:** 10 hallazgos de `/code-review`. Uno real y corregido: el cuerpo del PR seguía diciendo que no se cambiaba ninguna regla y faltaba `logica-negocio`; lo arreglé al actualizar el cuerpo. Otro marcó el cambio de `crearConsulta` como fuera de alcance, pero lo había pedido el orquestador. Los otros ocho (mensaje de una segunda lectura bajo concurrencia, refrescar también ante `no-encontrada`, unificar el catch de los índices, derivar tipos, rama muerta en controles, `autor` malformado en `$in`, `emailEnviado` ausente) son reales pero chicos y quedaron afuera por el límite de la ronda; están listados en el PR.
**Propuesta:** que el orquestador pase el cuerpo del PR como parte de lo que hay que actualizar cuando cambia una regla: `/code-review` sobre el PR lee la descripción vieja y lo marca como el hallazgo más grave aunque ya estuviera previsto.
