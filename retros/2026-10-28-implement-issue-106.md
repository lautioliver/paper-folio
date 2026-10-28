---
skill: implement-issue
issue: 106
pr: 107
area: web, panel
rutas: src/lib/contact.ts, src/lib/validacion-campo.ts, src/components/panel/validacion-en-vivo.tsx, src/components/sitio/ContactForm.tsx, src/app/panel/{proyectos,demos,servicios}/formulario.tsx
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-28
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el primer /code-review corrió sobre el checkout principal (rango vacío) porque el skill se ejecuta fuera del worktree; hubo que repetirlo pasándole la ruta del worktree. Corrí prettier sobre carpetas enteras y reformateó decenas de archivos (el repo no tiene config, usa ancho 120): lo revertí.
**Decisiones no cubiertas:** sin jsdom, la lógica del navegador (eventos, contador, foco) no se testea; extraje la parte pura (validateContactField, mensajeDeValidez). Un hook compartido con div display:contents para los tres formularios del panel. No puse logica-negocio: ningún ADR define la regla del nombre.
**Lo que encontró la revisión:** estados de validez sin mensaje con el globo nativo cancelado, contador contando radios, límites escritos a mano en mensajes.
**Propuesta:** que implement-issue avise que /code-review como subagente necesita la ruta del worktree, y que prettier solo se corre con --print-width 120 sobre archivos propios.
