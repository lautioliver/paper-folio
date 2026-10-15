---
skill: implement-issue
issue: 15
pr: 16
area: area:infra
rutas: .github/workflows/ci.yml, docs/development/setup.md
fecha: 2026-10-15
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
modelo: opus
rol: sesion
---
**Desvíos:** sin test (config de CI); la verificación fue el CI del propio PR con rerun. /code-review se corrió antes del PR, no después del tercer commit (que fijó MONGOMS_DOWNLOAD_DIR).
**Decisiones no cubiertas:** la revisión del #14 afirmaba que npm ci corría el postinstall de mongodb-memory-server en CI; el log mostró que npm 11 lo bloquea. Y la carpeta del binario en Actions no era ~/.cache/mongodb-binaries: solo se vio porque el paso de guardado avisó Path Validation Error. Sin probar la caché en CI real, el PR habría entrado "verde" sin cachear nada.
**Lo que encontró la revisión:** /code-review: clave sin versión de Ubuntu, clave por lock que acumulaba entradas, save solo si el job pasa (corregidos); dependencia de la versión de npm (comentario reescrito); aprobación de CI (en el chat, registrada en #14). Además, el checkout principal tenía dependencias viejas tras los merges (caso #11) y verificar.py falló en typecheck hasta reinstalar.
**Propuesta:** para cambios de CI, que implement-issue pida verificar el comportamiento en una corrida real (no solo que el check quede verde), y que el criterio de aceptación diga cómo observarlo en el log.
