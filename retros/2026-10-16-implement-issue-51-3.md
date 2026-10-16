---
skill: implement-issue
issue: 51
pr: 64
area: panel
rutas: src/components/panel/enlaces.ts, src/components/panel/enlaces.test.ts, src/components/panel/PanelShell.tsx, src/app/panel/layout.tsx, docs/reference/modules.md, docs/development/architecture.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno. Fueron dos merges de origin/main: el de #63, con conflictos en el menú y en los docs, y el de #65, limpio. El límite de sesión cortó la corrida en medio del chequeo en el navegador, con el merge ya pusheado. No se perdió nada.
**Decisiones no cubiertas:** el chequeo en Chromium sin Playwright en el repo. Usé chrome-headless-shell de la caché de Playwright por CDP con el WebSocket de Node 24, una cookie de sesión generada con `encode` de next-auth/jwt y mongodb-memory-server. El primer intento dio 403 a todos porque el rol sale de ADMIN_EMAILS y OPERADOR_EMAILS, no del campo `rol` de la base: hay que exportar esas listas al levantar `next dev`.
**Lo que encontró la revisión:** nada nuevo. En el navegador, un operador que abre /panel/proyectos ve el 403 sin el menú, y en /panel/servicios lo ve con el menú. Es un detalle de UI: el shell de 403 depende de dónde cae el `forbidden()` con o sin Suspense. No tiene efecto en los permisos.
**Propuesta:** documentar en setup.md o en lecciones cómo levantar el panel con sesiones de prueba (memory-server, encode, ADMIN_EMAILS/OPERADOR_EMAILS), así el revisor y el implementador no lo reinventan.
