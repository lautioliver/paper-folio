---
skill: implement-issue
issue: 49
pr: 69
area: auth, panel
rutas: src/lib/acceso.ts, src/lib/usuarios.ts, src/lib/usuarios-admin.ts, src/auth.ts, src/models/Usuario.ts, src/app/panel/usuarios, src/app/(auth)/ingresar, docs/decisions/ADR-002-auth.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** El primer `/code-review` (con la herramienta Skill y el argumento `origin/main...HEAD`) corrió en el checkout principal (en main) y no encontró diff. Hubo que volver a lanzarlo con el nombre de la rama y la ruta del worktree. `/security-review` armó su contexto también desde el checkout principal (vacío): la revisión la hice a mano sobre el diff del worktree, sin sub-tareas.
**Decisiones no cubiertas:** El issue decía "al ingresar se fuerza admin" y el orquestador pedía que sacar a alguien de ADMIN_EMAILS revoque el rol. Se reconcilió así: el admin por entorno no se guarda, se suma al leer. Los documentos de antes (sin `bloqueado`) no son confiables, porque su rol se recalculaba con las listas y podía estar viejo. Se normalizan solos a `usuario` (idempotente, sin script). Efecto: los operadores por OPERADOR_EMAILS se reasignan desde el panel (está en el ADR y en el PR). Para la UI, botones sin campos con valor inicial y aviso en la URL, así se evita el DOM viejo de `<Activity>`.
**Lo que encontró la revisión:** code-review encontró 10 cosas y se corrigieron 5. Las principales: el rollback de "último admin" corría con cualquier cambio y pisaba sin condición (deshacía cambios sin relación), y una cuenta bloqueada veía la página genérica en inglés de Auth.js (se agregó `pages.error: /ingresar` con el aviso AccessDenied). security-review: nada.
**Propuesta:** En implement-issue (paso 5) y en el contrato, decir que `/code-review` y `/security-review` lanzados con Skill corren en el cwd de la sesión, no en el worktree: pasar la rama y la ruta del worktree en los argumentos, y revisar que el diff que miraron no esté vacío.
