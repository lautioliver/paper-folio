---
skill: implement-issue
issue: 23
pr: 27
area: api
rutas: src/models/Consulta.ts, src/lib/consultas.ts, src/lib/env.ts, docs/mapa-agentes.json
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-15
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el primer /code-review corrió desde el checkout principal y revisó un diff vacío (el cwd del Skill no es el del worktree); lo repetí pasando la ruta del worktree y el comando git. Corrí prettier con su ancho por defecto y reformateó archivos existentes: hubo que revertir el ruido (el repo no tiene config de prettier, el ancho real ronda 100-120).
**Decisiones no cubiertas:** `bufferCommands: false` hace fallar el autoCreate/autoIndex del modelo al registrarse (createCollection de undefined); lo resolví con ambos en false y creando el índice desde el servicio. `sitio_web` se lee antes de validar. `IP_HASH_SAL` en un esquema aparte para que leerEnv y /api/salud no la exijan.
**Lo que encontró la revisión:** 9 hallazgos, corregí 2 (tipado del modelo, ruido de formato). El resto eran del alcance de otros issues (avisar, IP del endpoint) o decisiones del issue (SHA-256 en vez de HMAC).
**Propuesta:** en la skill, avisar que /code-review como subagente necesita la ruta del worktree explícita; y que no se corra prettier sin la config del repo.
