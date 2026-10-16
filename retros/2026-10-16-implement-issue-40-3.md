---
skill: implement-issue
issue: 40
pr: 62
area: panel, api
rutas: package.json, package-lock.json, src/lib/respuestas.ts, docs/development/setup.md, docs/reference/
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** un `sed` que reemplazaba los imports de "nodemailer" también pisó el shim de tipos que acababa de crear y lo dejó autorreferente. Lo arreglé enseguida, pero un reemplazo masivo hay que acotarlo a los archivos que corresponden. Mientras `/code-review` corría, el coordinador pidió traer main: lo mergeé antes de cerrar.
**Decisiones no cubiertas:** el coordinador sugirió un shim que reexportara `@types/nodemailer`. `/code-review` encontró que nodemailer 10 trae sus propios tipos y que el shim ambiental los tapaba con los de la 8. Lo saqué y el typecheck pasa igual. `@types/nodemailer` quedó sin uso, pero no lo quité: sacar una dependencia se consulta. Resolví los conflictos de docs (tablas) con un script que conserva los dos lados y avisa si main cambió una fila compartida.
**Lo que encontró la revisión:** el shim era innecesario y además dañino, porque dejaba los tipos de la 8 sobre el runtime de la 10. También faltaba el link a la aprobación en setup.md.
**Propuesta:** lección: antes de escribir un `.d.ts` para un paquete (o un alias), fijarse si el paquete trae sus tipos (campo `types` o un `.d.ts` junto al `.js` en `exports`). Un `declare module` ambiental gana sobre esos tipos.
