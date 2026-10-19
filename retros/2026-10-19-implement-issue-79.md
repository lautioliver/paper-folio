---
skill: implement-issue
issue: 79
pr: sin PR
area: diseno
rutas: src/app (favicon e íconos, sin cambios)
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-19
modelo: haiku
rol: implementador-liviano
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** frené antes de escribir código y no hice tests rojos. Motivo: el issue depende de tres decisiones de formato, colores y fuente que no están en el issue ni en AGENTS.md (ver consulta en el issue). Escalar no aplica: mapa.py no marca rutas sensibles.

**Decisiones no cubiertas:** el formato del ícono (generado con ImageResponse o estático) no está definido. Tampoco cómo cumplir la regla de tokens (tokens.test.ts prohíbe HEX en .ts/.tsx) ni de dónde sale el archivo de Onest Bold, que next/font/google no deja en el repo.

**Lo que encontró la revisión:** no aplica (sin PR).

**Propuesta:** en issues de diseño con marca, la skill podría pedir al orquestador, antes de tomar el issue, si el formato y el origen de la fuente ya están decididos.
