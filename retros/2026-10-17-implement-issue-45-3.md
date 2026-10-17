---
skill: implement-issue
issue: 45
pr: 73
area: auth
rutas: src/lib/ingreso.ts, src/lib/sesion.ts, src/app/(auth)/ingresar/page.tsx, src/auth.ts, docs/reference/modules.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** la prueba en Chromium corrió sobre a7cef1e. El último arreglo (3617b73, cómo se normaliza el destino) lo cubren solo los tests unitarios. El merge de origin/main (#74) dejó un conflicto en modules.md: lo resolví conservando las filas de los dos lados.
**Decisiones no cubiertas:** que la cookie ya no se lea lo pruebo con tests sobre los nombres exportados y con decidirIngreso ignorando la propiedad vieja. Son débiles, pero los pidió el orquestador. El ADR queda sin cambios: R-5 se sigue cumpliendo y rechazar /ingresar y /api/ es un control más estricto. Lo dejé para que el revisor decida si lleva logica-negocio.
**Lo que encontró la revisión:** el bucle seguía por las rutas de Auth.js (/api/auth/*) que vuelven a /ingresar?error= sin callbackUrl: tapar destinos de a uno no alcanzaba. La causa era redirigir desde la cookie con sesión válida, y @lautioliver decidió sacar esa recuperación. /code-review encontró que la ruta decodificada se volvía a parsear con URL: "/.//api" se leía como el host "api" y salteaba el filtro. Mi test con "//api" no lo ejercitaba, porque rutaInterna ya lo cortaba antes.
**Propuesta:** en la skill, cuando se valida una ruta normalizada, no volver a parsearla con URL después de decodificarla, y probar casos que pasen el primer filtro (rutaInterna), así llegan de verdad al segundo.
