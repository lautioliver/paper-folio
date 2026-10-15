---
skill: implement-issue
issue: 24
pr: 28
area: api
rutas: package.json, package-lock.json, src/lib/email.ts, src/lib/env.ts, src/lib/consultas.ts
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-15
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el primer /code-review lo corrí con `origin/main...HEAD` con la rama sin rebasar y cwd equivocado: dio vacío; hubo que rebasar (main avanzó, conflicto en modules.md) y repetirlo sobre el PR. Los tests de env quedaron sin rojo real porque implementé `leerEmailConfig` completo en el commit de tests (era trivial).
**Decisiones no cubiertas:** `avisar` por defecto = avisarConsultaNueva, y mockear `./email` en consultas.test.ts para que ningún test viejo llegue a Resend si hay env local. Prettier sin config del repo reformatea todo (ancho 100 aprox.): lo usé solo con --print-width y revertí el ruido.
**Lo que encontró la revisión:** marcar emailEnviado compartía try con el envío (corregido), tabla rota en setup.md (corregido), envío sincrónico sin timeout (no corregido, anotado en el PR).
**Propuesta:** que la skill diga rebasar sobre origin/main antes de la autorevisión y correr /code-review por número de PR cuando el cwd no es fiable.
