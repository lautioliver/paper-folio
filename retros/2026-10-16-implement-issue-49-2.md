---
skill: implement-issue
issue: 49
pr: 69
area: auth, panel
rutas: src/lib/acceso.ts, src/lib/ingreso.ts, src/auth.ts, src/app/(auth)/ingresar/page.tsx, docs/decisions/ADR-002-auth.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** En la primera ronda abrí el PR con un plan de migración distinto del aprobado (normalizarLegados, ADMIN_EMAILS sin guardar) y lo conté solo en el cuerpo del PR, sin pedir un "sí" aparte. El revisor lo marcó como bloqueante y la persona lo aprobó después. Esperar la notificación del /code-review lanzado con Skill costó intentos: un `until grep` sobre el .output encontró el texto de la plantilla y terminó antes de tiempo.
**Decisiones no cubiertas:** Auth.js convierte cualquier excepción de `signIn` en AccessDenied. Para distinguir el bloqueo de una caída de la base, `signIn` devuelve URLs propias (`?error=bloqueado`, `?error=reintentar`). Sin sesión, `error=bloqueado` muestra un aviso que igual deja ingresar con otra cuenta, porque cualquiera puede armar el link. Los códigos desconocidos muestran un aviso genérico y se validan con z.enum.
**Lo que encontró la revisión:** Revisor: el plan de migración no era el aprobado (bloqueante), la base caída se mostraba como "cuenta denegada", y los demás errores de Auth.js quedaban sin aviso. /code-review de la ronda: con `error=bloqueado` armado a mano, sin sesión, la pantalla solo ofrecía "Salir" y no dejaba ingresar; el nombre `verificacion` estaba duplicado; el tipo de retorno era laxo; y había un log dentro de acceso.ts, que es puro.
**Propuesta:** En implement-issue (paso 2), si el plan de db-migration que se implementa no es el del issue aprobado (otro backfill, otra regla), consultar antes del PR con la tabla nueva, aunque sea "más seguro".
