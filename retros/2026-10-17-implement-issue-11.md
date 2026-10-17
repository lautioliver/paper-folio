---
skill: implement-issue
issue: 11
pr: 76
area: area:infra
rutas: scripts/agentes/verificar.py, scripts/agentes/test_verificar.py, docs/development/setup.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el cuerpo del issue pedía "salir con error" y tests con `test-base.sh`; mandó la decisión de la persona (solo avisar) y los tests fueron con unittest (`test-base.sh` sale de entrada con la base configurada). Un comando mío con `cat >> /dev/null` quedó colgado esperando stdin; lo maté por PID (un `pkill` amplio lo frenó el clasificador, con razón).
**Decisiones no cubiertas:** el mapa no corre `test_verificar.py` localmente (lo corre el CI con `unittest discover`); no se tocó el mapa por pedido del orquestador. `rojo.sh` tomó como "razón equivocada" una falla porque el texto del aviso citaba "Cannot find module": hubo que reescribir el mensaje.
**Lo que encontró la revisión:** /code-review, 9 hallazgos, 4 corregidos: recordatorio final que culpaba a las dependencias por fallas sin npm, aviso sin verificaciones de npm que corran, tests que heredaban GIT_DIR/GIT_INDEX_FILE, aserciones faltantes en el test del worktree. No corregidos y explicados en el PR: comparación por mtime (criterio del issue, igual que preparar.sh), --ignore-scripts en el checkout principal, regla del mapa, duplicación con preparar.sh.
**Propuesta:** `rojo.sh` podría buscar los patrones de "mala razón" solo fuera de las líneas `AssertionError`, para no confundir el texto esperado con una falla de carga. Sumar al mapa una regla para `scripts/agentes/test_*.py` (consulta de infra).
