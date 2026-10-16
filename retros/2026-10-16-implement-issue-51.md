---
skill: implement-issue
issue: 51
pr: 64
area: panel
rutas: src/lib/proyectos-admin.ts, src/lib/proyecto-entrada.ts, src/app/panel/proyectos/, src/components/panel/, src/app/panel/layout.tsx
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el primer `/code-review` (Skill, forked) corrió en el checkout principal y no en el worktree. El rango `origin/main...HEAD` le dio vacío, así que revisó el último commit de main (#60) y devolvió hallazgos de otro PR. Lo relancé pasándole el nombre de la rama y la ruta del worktree, y ahí revisó el diff correcto. Los cambios de los componentes de cliente (no guardar mientras sube la imagen, avisos de ADR-003 R-5) quedaron sin test, porque no hay jsdom y sumarlo es una dependencia.
**Decisiones no cubiertas:** qué hacer al borrar un proyecto con demos: elegí la cascada, primero el proyecto y después las demos. Para el menú del panel, una lista `ENLACES_PANEL` con una entrada por sección y `enlacesPara(rol)`, así #52 suma una línea, más un `EnlaceActual` de cliente para `aria-current`. Los largos que el issue no fijaba (nombre 80, categoría 60, ítems 40, listas del caso 20) salieron de un criterio propio. Una constante exportada desde un módulo "use client" e importada en un server component llega como referencia de cliente y no como string: la moví a un `.ts` común.
**Lo que encontró la revisión:** 10 hallazgos, 4 corregidos: refrescar la lista cuando la pantalla quedó vieja (con test en rojo), guardar mientras sube la imagen, el conteo de demos en serie y la falta de aviso de ADR-003 R-5 (al crear el primer proyecto en borrador, el sitio queda vacío; al borrar el último, vuelve el contenido estático). No corregidos: la carrera de `orden`, el callbackUrl fijo del layout (ya existía) y duplicaciones (`ID_VALIDO`, `Mensaje`).
**Propuesta:** en implement-issue (paso 5) o en el contrato de subagentes, aclarar que `/code-review` lanzado con la herramienta Skill corre en el directorio de la sesión, no en el worktree: hay que pasarle la rama (y la ruta del worktree) como objetivo, no `origin/main...HEAD`.
