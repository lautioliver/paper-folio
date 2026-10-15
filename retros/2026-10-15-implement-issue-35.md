---
skill: implement-issue
issue: 35
pr: 42
area: auth
rutas: src/app/(auth)/ingresar, src/app/(sitio)/cuenta, src/components/sitio/Navbar.tsx, src/components/sitio/MenuCuenta.tsx, src/lib/ingreso.ts, src/lib/sesion.ts
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-15
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** `/code-review` y `/security-review` corren en el checkout principal (forked), no en el worktree: la primera vez revisaron `main` limpio y no vieron nada. Hubo que abrir el PR antes y pasarle el número para que revisara la rama. La skill dice "diff de la rama" sin avisar de esto.
**Decisiones no cubiertas:** Auth.js llama a `crypto.getRandomValues` antes de leer cookies: en dev con cacheComponents el prerender marca la ruta como bloqueante (y en la barra, un catch genérico podía tragarse la señal de dinámico y congelar "Ingresar" en el HTML estático). Se resolvió con `await connection()` antes de `auth()`. Vitest solo corre .ts y no resuelve next-auth: los componentes y `sesion.ts` quedan sin test; la lógica testeable se sacó a `ingreso.ts`.
**Lo que encontró la revisión:** onBlur cerraba el menú al hacer clic en Salir en Safari (relatedTarget null), /ingresar daba 500 con cookie corrupta, `??` no cubría nombre vacío. security-review: nada (se hizo a mano, sin diff).
**Propuesta:** en implement-issue paso 5, decir que con subagentes conviene abrir el PR y correr `/code-review <n>`; y anotar en lecciones lo de `connection()` antes de `auth()` para #37.
