---
skill: implement-issue
issue: 54
pr: 70
area: area:db, area:auth
rutas: src/lib/accesos.ts, src/lib/usuarios.test.ts, docs/reference/domain.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** El test nuevo ("un admin que ingresa suma un acceso") fija un comportamiento que ya existía, así que `rojo.sh` no lo puede dar en rojo. Para comprobar que prueba algo, hice una mutación temporal: si `registrarIngreso` no cuenta a los admin, el test falla. Lo dejé dicho en el PR. El commit `test(db)` también lleva el docstring y el doc.
**Decisiones no cubiertas:** En la primera ronda di por hecho que los admin cuentan porque la decisión 3 de la épica no los excluía, sin mirar que los Riesgos de la misma épica decían lo contrario. El revisor lo marcó y lo decidió la persona. Faltó leer la épica entera como un conjunto de reglas: los Riesgos también son reglas.
**Lo que encontró la revisión:** El revisor encontró un docstring que nombraba `verCasoDeEstudio`, una función ya borrada, y la contradicción con los Riesgos de la épica. En esta ronda `/code-review` repitió hallazgos ya explicados en el PR y dos sobre consultas que ya constaban (aprobación del schema y "ADR sin cambios"). No hubo nada nuevo que corregir.
**Propuesta:** Que `rojo.sh` acepte un modo "fija comportamiento existente", que pida un comando de mutación y verifique que con ella falla. Así este caso queda registrado en un formato estándar.
