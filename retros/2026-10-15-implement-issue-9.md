---
skill: implement-issue
issue: 9
pr: 10
area: area:infra
rutas: .claude/skills/implement-issue/preparar.sh, .claude/skills/implement-issue/test-preparar.sh, .claude/skills/implement-issue/SKILL.md
fecha: 2026-10-15
skill_sha: 27ac2dbbc61f0c431f7e6f7143bfe0afcb303983
modelo: opus
rol: sesion
---
**Desvíos:** ninguno. Consulté el diseño antes de escribir código (scripts de agentes) y los hallazgos corregidos siguieron test rojo → arreglo → verde.
**Decisiones no cubiertas:** el fixture de test-preparar.sh no tenía .gitignore: con node_modules sin ignorar, retomar un worktree falla por "cambios sin commitear". Lo resolví en el fixture y lo dejé dicho en el PR como límite. El criterio 2 ("verificar.py pasa en un worktree recién creado") no se puede probar sin tomar un issue real: lo probé con `git worktree add --detach` y los mismos flags de npm.
**Lo que encontró la revisión:** /code-review: lock más nuevo que lo instalado no reinstalaba, carrera de asignación más larga por npm ci, scripts de instalación de ramas ajenas, npm ausente con mensaje engañoso, salida de npm en stdout. Corregidos. Descartados con motivo: lock sin dependencias, node_modules sin ignorar, modo sin --worktree, pnpm/yarn.
**Propuesta:** que la plantilla traiga node_modules en .gitignore cuando hay package.json, o que preparar.sh avise si node_modules no está ignorado.
