---
skill: implement-issue
issue: 40
pr: 62
area: panel, api
rutas: src/lib/respuestas.ts, src/lib/seguimiento.ts, src/lib/env.ts, src/lib/estados-consulta.ts, src/app/panel/consultas/[id]/, vitest.config.ts, package.json, docs/
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el primer commit usó el scope `deps`, que no existe; lo enmendé a `build:` antes de pushear. Después del rojo inicial tuve que retocar dos aserciones del detalle (la de ausencia del formulario usaba un `name` que no era el real y pasaba siempre). Dejé `/code-review` corriendo en segundo plano mientras escribía los docs.
**Decisiones no cubiertas:** desde qué estados se responde (elegí solo `en_curso`, sin tocar `TRANSICIONES`); si el paso a `respondida` deja una entrada `estado` (sí); si un fallo de configuración se registra como intento (no, después de la revisión). `npm install nodemailer` resolvió la 8.0.11 aunque `npm view` mostraba la 10.1.1 como latest, sin `.npmrc` que lo explique. La dejé, porque coincide con `@types/nodemailer` 8. Enmendé ADR-001 R-4 (Resend → Gmail para las respuestas) y puse `logica-negocio`, porque el ADR contradecía la decisión aprobada en la épica.
**Lo que encontró la revisión:** `/code-review` dio 9 hallazgos y corregí 6. El grave fue que `SMTPTransport.close()` de nodemailer no corta un envío en curso, así que el timeout por `Promise.race` puede dar por fallido un email que llega igual. Lo mitigué con timeouts propios más cortos y un mensaje que avisa. El doble envío concurrente quedó sin cerrar porque necesita un campo nuevo (schema). Los otros: asunto con el enum crudo, intentos sin configuración registrados, mensaje engañoso si borran la consulta mientras se envía, doble error de Zod, constante triplicada. Un falso positivo: la dependencia "sin aprobación", que estaba en un comentario del issue.
**Propuesta:** lección: con librerías de red que no aceptan AbortSignal (nodemailer), un timeout por `Promise.race` no cancela nada. Hay que verificar en `node_modules` qué hace `close()` antes de prometer que corta.
