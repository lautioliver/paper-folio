---
skill: implement-issue
issue: 40
pr: 62
area: panel, api
rutas: src/lib/seguimiento.ts, src/lib/respuestas.ts, src/app/panel/consultas/[id]/, docs/reference/, docs/decisions/ADR-001-stack.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el bloqueante 1 (subir nodemailer a ^10.1.1) no se pudo hacer. Instalar la 10 saca `@auth/core` del primer nivel de `node_modules` (su peer opcional pide nodemailer ^7||^8), la augmentación `declare module "@auth/core/jwt"` deja de aplicar y el typecheck de src/auth.ts se rompe. El `--dry-run` del revisor no lo mostraba. Probé `next-auth/jwt` y `overrides` (ninguno sirve), lo revertí, lo consulté en el issue y seguí con los puntos 2 a 4. Un `npm install` con `--dry-run` no alcanza para validar un cambio de versión mayor: hay que mirar qué paquetes se mueven en el lock y correr el typecheck.
**Decisiones no cubiertas:** el doble envío se cerró sin schema: una entrada `respuesta` pendiente (sin `emailEnviado`) como reserva, con vencimiento a los 2 minutos para que un proceso caído no la deje bloqueada para siempre. La entrada se completa con un update pipeline (`$set` posicional y `$push` al mismo array dan conflicto en Mongo; Mongoose 9 exige `updatePipeline: true`). El timeout sigue marcando `emailEnviado: false` para cumplir el criterio del issue, con un texto que no afirma que no llegó. CI no corrió sobre un push mientras el PR tenía conflicto con main: lo detecté por `mergeStateStatus: DIRTY` e hice el merge.
**Lo que encontró la revisión:** `/code-review 62` dio 7 hallazgos y corregí 3. El real: con `arrayFilters`, `matchedCount` cuenta el documento aunque no haya ningún elemento que marcar, así que una respuesta sin su entrada pendiente se daba por registrada. Los otros dos: el mensaje de `en-envio` afirmaba algo que no siempre es cierto, y el chequeo de estado estaba duplicado.
**Propuesta:** lección: si `gh pr checks` no muestra `ci` o `docs` después de un push, mirar `mergeStateStatus`, porque con conflictos los workflows `pull_request` no corren. Y validar los cambios de versión mayor con el diff del lock y el typecheck, no solo con `--dry-run`.
