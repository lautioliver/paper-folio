---
skill: implement-issue
issue: 45
pr: 73
area: auth
rutas: src/auth.ts, src/lib/ingreso.ts, src/lib/sesion.ts, src/lib/sesion-acciones.ts, src/lib/acceso.ts, src/app/(auth)/ingresar/page.tsx
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el primer `/code-review origin/main...HEAD` corrió desde el checkout principal (el cwd del fork no es el worktree), encontró el diff vacío y revisó HEAD~1 de main, o sea otro PR (#71). Lo volví a lanzar pasándole el nombre de la rama, y esa vez revisó el diff correcto. En el primer rojo un test falló por una expectativa mía equivocada (`salirEIngresarDeNuevo` no agrega `error=sesion`): lo corregí antes de commitear.
**Decisiones no cubiertas:** para conservar el callbackUrl usé, desde /ingresar, la cookie `authjs.callback-url` que guarda Auth.js, en vez de leerla en la config perezosa para el callback `signIn`. Así cubre también AccessDenied, Configuration y OAuthCallbackError, y `permiteIngreso` no se toca. Configuration va sin botón, como pidió el orquestador, aunque Auth.js también manda así fallas pasajeras (la base en el callback `jwt`). Los códigos de v4 que siguen en `SignInPageErrorParam` quedaron mapeados. Simular la cancelación en Google necesitó el parámetro `iss`: sin él da Configuration y no OAuthCallbackError.
**Lo que encontró la revisión:** la cookie no se borra al terminar el ingreso, así que la vuelta guardada podía salir de un ingreso viejo con un link armado (limitado a errores del ingreso conocidos). El esquema Zod de ruta interna estaba duplicado. El mapa de avisos de la página no era exhaustivo por tipo. Si la cookie `__Secure-` no servía, no se probaba la otra. Además marcó como falta de aprobación algo que sí estaba aprobado (falso).
**Propuesta:** en la skill, decir que `/code-review` desde un subagente se lanza con el nombre de la rama, no con `origin/main...HEAD`, porque el fork corre en el checkout principal.
