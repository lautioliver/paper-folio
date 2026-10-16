---
skill: implement-issue
issue: 47
pr: 58
area: api
rutas: src/lib/imagenes.ts, src/app/api/imagenes/route.ts, src/lib/env.ts, vitest.config.ts, package.json, docs/development/setup.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: opus
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** Corrí en Opus aunque la definición dice sonnet, porque el límite de Sonnet estaba agotado. `/code-review` corrió con el PR ya abierto (sobre el número del PR, como pidió el orquestador) y no antes de abrirlo, como dice el paso 5. Después del commit en rojo agregué un test (413 por Content-Length) y cambié el esperado de un caso de 400 a 415. Lo aclaré en el PR. El primer commit usó el scope `deps`, que no es válido; lo rehíce como `build:` antes de pushear.
**Decisiones no cubiertas:** Route handler o server action para subir 2 MB: elegí el route handler para no tocar `bodySizeLimit` y tener un 403 HTTP real. Dejé `next.config.ts` sin cambios porque nada usa `next/image` todavía. Agregué un segundo import en `env.test.ts` para no chocar con los implementadores de #39 y #48, que corren en paralelo. Vacié en `vitest.config.ts` las credenciales de Blob.
**Lo que encontró la revisión:** `/code-review` dio 10 hallazgos y corregí 3. Uno no lo había visto: CSRF desde un subdominio (same-site). Los route handlers no tienen el chequeo de origen de las server actions; lo resolví con `Sec-Fetch-Site`. Los otros dos fueron el mensaje de tamaño duplicado y que `BLOB_STORE_ID` vacía no decía "falta". Quedó abierto que `requerirRol` en una API devuelve un redirect o el 403 HTML de `forbidden()`, no JSON. El scratchpad es compartido entre sesiones: mi copia `rojo.md` la pisó otro agente y el bloque rojo quedó con fallas del #39. Lo noté antes de abrir el PR y lo regeneré en una subcarpeta propia.
**Propuesta:** En el contrato o en implement-issue, pedir que cada subagente use un subdirectorio propio del scratchpad (por ejemplo `i<n>/`) y que pase `TMPDIR` a `rojo.sh`. En `review-pr` o en las lecciones: un route handler que recibe form/multipart con cookie tiene que chequear el origen (`Sec-Fetch-Site`), porque Next solo lo hace en las server actions.
