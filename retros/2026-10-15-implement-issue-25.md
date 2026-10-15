---
skill: implement-issue
issue: 25
pr: 29
area: api, web
rutas: src/app/api/consultas, src/lib/ip.ts, src/components/sitio/ContactForm.tsx, docs
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-15
modelo: sonnet
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** el primer `/code-review origin/main...HEAD` se corrió con cwd en el checkout principal y revisó el diff equivocado (vacío); se repitió con el número del PR. El componente no tiene test automático (sin jsdom): lo cubrió Playwright.
**Decisiones no cubiertas:** sin IP, 400 IP_NO_DETECTADA en vez de un balde compartido. Merge de main a mitad de tarea por el #26 (conflicto solo en architecture.md).
**Lo que encontró la revisión:** doble envío y 400 sin campos en el formulario (corregidos); el resto lo expliqué en el PR.
**Propuesta:** que la skill diga que /code-review se corre con el número del PR cuando el cwd no es la rama, o tras abrir el PR.
