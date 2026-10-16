---
skill: implement-issue
issue: 39
pr: 59
area: area:panel, area:db
rutas: src/models/Consulta.ts, src/lib/estados-consulta.ts, src/lib/seguimiento.ts, src/lib/bandeja.ts, src/app/panel/consultas/[id]/, src/components/panel/ChipEstado.tsx, docs/reference
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: opus
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** corrió en Opus, no en Sonnet (la definición dice sonnet; Sonnet sin cupo por decisión de la persona). Abrí el PR antes de `/code-review` porque el orquestador pidió correrlo con el número del PR (con un rango, en corridas anteriores revisó un diff vacío): la autorevisión quedó después del PR, no antes como dice el paso 5. Me frenaron (pausa de la persona) mientras miraba el CI; seguí cuando me relanzaron. `/security-review` lo hice a mano sobre el diff.
**Decisiones no cubiertas:** las transiciones de la épica se pueden leer como cadena estricta o como orden del ciclo de vida: tomé la estricta (no se archiva una `nueva` a mano) y lo dejé para el revisor. La lección del orquestador decía sacar el fallback de estado desconocido; `/code-review` mostró que sin él una consulta con estado viejo queda trabada, así que se volvió explícito (`estadoLeido` + `filtroDeEstados`, incluido el filtro y las transiciones). Para probar las server actions de punta a punta armé sesiones JWT con `@auth/core/jwt` contra un `mongodb-memory-server` y `next dev -p 3460`; el formato de FormData de React en el POST de una acción es `_<id>_<campo>` (no `<id>_`), lo que costó un intento.
**Lo que encontró la revisión:** `/code-review 59`, 9 hallazgos, 8 corregidos con test en rojo: estado viejo o inválido crudo con `.lean()` (chip vacío y consulta trabada), CRLF contra el `maxLength` de 2000, la nota se pierde por el reset del formulario de React 19 aunque la acción falle, la bandeja caía si fallaba crear el índice, `LARGO_MAXIMO_NOTA` duplicado, `esTransicionValida` sin uso en producción, componentes que importaban de `bandeja.ts` (Mongoose). El de enum + required con documentos viejos era falso: `updateOne` con `runValidators` solo valida los paths que actualiza. Uno de mis tests nuevos fallaba al principio por un ValidationError (sembraba con Mongoose) y no por la aserción; lo vi recién en verde.
**Propuesta:** en `implement-issue` paso 3, recordar que `rojo.sh` tiene que mostrar AssertionError en cada test: un ValidationError o un error al sembrar datos también es "rojo" y lo deja pasar. Y en lecciones: el reset automático de los formularios con acción en React 19 borra lo que se escribió aunque la acción devuelva error.
