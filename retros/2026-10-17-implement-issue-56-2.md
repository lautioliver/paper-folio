---
skill: implement-issue
issue: 56
pr: 74
area: panel
rutas: src/components/panel/EnlacesPanel.tsx, src/app/panel/metricas/page.tsx, docs/reference/
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-17
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** Corregí lo de la revisión sin test en rojo: es comportamiento de DOM (scroll y foco) y Vitest no tiene DOM en el repo. Lo verifiqué midiendo en Chromium. Le pasé a `/code-review` un sha inventado (2a7ae6c); igual revisó la punta correcta. Una heredoc sin comillas en bash ejecutó un `/code-review` entre backticks y rompió el cuerpo del PR; lo reparé.
**Decisiones no cubiertas:** El foco recortado no era solo el padding. Chrome no desplaza la lista si el chip que recibe Tab asoma en parte, y hubo que forzar `scrollIntoView` en `onFocus`, pero solo con `:focus-visible`: con el mouse, el foco llega en el mousedown y el chip se movía antes del clic.
**Lo que encontró la revisión:** Mi primer arreglo del foco tenía un bug que solo vio `/code-review`: el clic sobre un chip a medias se perdía. También encontró que la barra no se actualizaba al aparecer por un resize. Mi prueba en Chromium no los había visto, porque solo navegaba con Tab y clics en chips enteros.
**Propuesta:** En la UI con scroll, que la prueba en navegador incluya teclado, clic en un elemento a medias y cambio de viewport. Y escribir el cuerpo del PR con heredoc entre comillas (`<<'EOF'`).
