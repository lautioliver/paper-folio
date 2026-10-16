---
skill: implement-issue
issue: 52
pr: 63
area: panel
rutas: src/lib/servicios-admin.ts, src/app/panel/servicios/, src/components/panel/, src/app/panel/layout.tsx
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el test de `subida.ts` (helper de subida desde el formulario) se escribió junto con el código, no en rojo antes; está dicho en el PR. El arreglo del hallazgo del ícono perdido no tiene test (componente de cliente, Vitest sin jsdom).
**Decisiones no cubiertas:** el primer `/code-review origin/main...HEAD` corrió en el checkout principal (el skill forkeado no hereda el worktree), vio un diff vacío y revisó el último commit de main; hubo que pushear la rama y pasarle la rama y la ruta del worktree. El scratchpad es compartido con otros subagentes de la misma sesión: el `rojo.md` que copié ahí lo pisó el de #51; se usó el original de rojo.sh en el TMPDIR. Menú del panel: se agregó `rol` a `PanelShell` y un componente de cliente para `aria-current` (antes fijo), una entrada por sección, para no pisarse con #51.
**Lo que encontró la revisión:** 10 hallazgos; corregidos 3 (ícono elegido perdido al alternar ícono/imagen, ilustración duplicada, docs faltantes). El resto quedó explicado en el PR: comportamientos de ADR-003 (colección vacía vuelve al respaldo; primer borrador deja la landing sin servicios), URL de imagen sin restringir al host de Blob, orden no atómico, índice único con duplicados previos.
**Propuesta:** en implement-issue paso 5, para subagentes en worktree: pasar a `/code-review` la rama (pusheada) y la ruta del worktree, no `origin/main...HEAD`, porque el skill forkeado corre en el checkout principal. Y guardar archivos intermedios con nombre único (incluir el n° de issue) si el scratchpad es compartido.
