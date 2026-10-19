---
skill: implement-issue
issue: 95
pr: 103
area: diseno
rutas: src/styles/globals.css, src/components/panel/EnlacesPanel.tsx, src/app/panel/metricas/page.tsx, src/app/panel/servicios/formulario.tsx, docs/development/architecture.md
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-19
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** no verifiqué en el navegador (solo tests de texto sobre el CSS y los TSX).
**Decisiones no cubiertas:** como probar CSS sin render: regex sobre el fuente. Subí el padding de la barra del panel de 8 a 12 px por la sombra y el anillo.
**Lo que encontró la revisión:** la sombra de `elegido` se perdía con `apretable` en hover/active, empate de especificidad del outline-offset con `foco-contenedor`, comentario de padding desactualizado. Ninguno lo vi al implementar: al combinar utilidades que tocan la misma propiedad (box-shadow, outline-offset) hay que revisar el orden y la especificidad.
**Propuesta:** nada.
