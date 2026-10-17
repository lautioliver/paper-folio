---
skill: implement-issue
issue: 45
pr: 73
area: auth
rutas: src/lib/ingreso.ts, src/lib/sesion.ts, src/lib/sesion-acciones.ts, src/app/(auth)/ingresar/page.tsx
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ninguno. Fue una ronda por bloqueantes del revisor, con TDD (rojo en 5705bc5 y 0a0bd33).
**Decisiones no cubiertas:** saqué la tabla de avisos de la página a src/lib/ingreso.ts, para poder testear el aviso de Configuration. El protocolo de la cookie se elige como Auth.js: AUTH_URL primero y después x-forwarded-proto. La normalización de /ingresar quedó amplia (mayúsculas, %XX), como pidió el orquestador, aunque Next distingue mayúsculas.
**Lo que encontró la revisión:** el revisor encontró algo que ni yo ni /code-review vimos en la primera ronda: un bucle de redirecciones del lado del cliente, cuando la cookie o el callbackUrl apuntan a /ingresar con sesión válida. rutaInterna lo acepta y el redirect dentro de Suspense no corta con ERR_TOO_MANY_REDIRECTS. En la segunda ronda, /code-review marcó que la cookie se elegía solo por x-forwarded-proto y no por AUTH_URL.
**Propuesta:** cuando un cambio agrega un destino de redirect nuevo, probar en el navegador el caso en que el destino es la misma página, con sesión válida. Para armar la sesión alcanza con encode de @auth/core/jwt y mongodb-memory-server.
