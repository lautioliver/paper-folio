---
skill: implement-issue
issue: 11
pr: 76
area: area:infra
rutas: scripts/agentes/verificar.py, scripts/agentes/test_verificar.py
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** ronda por un "a corregir" del revisor (falta de tests de usa_npm). El test nuevo cubre comportamiento que ya era correcto, así que no hubo rojo real; lo reemplacé por una mutación manual de la regex (rompí npx a propósito y falló) y lo dije en el PR. Un `gh pr view` corrido fuera del repo falló (cwd en el scratchpad); hay que correr gh desde el worktree.
**Decisiones no cubiertas:** la skill no dice qué hacer cuando un hallazgo pide tests de cobertura de algo que ya anda (sin rojo posible). Usé una mutación como evidencia.
**Lo que encontró la revisión:** /code-review de la ronda, 8 hallazgos, 0 corregidos: repetían los ya explicados (mapa, mtime, límites de la regex, que ahora están en el docstring) o eran de estilo. Vercel falló por el límite de deploys de la cuenta, no por el cambio.
**Propuesta:** que implement-issue diga que, en los tests de regresión de comportamiento existente, la evidencia es una mutación temporal y no rojo.sh.
