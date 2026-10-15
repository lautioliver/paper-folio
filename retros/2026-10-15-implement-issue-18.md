---
skill: implement-issue
issue: 18
pr: 19
area: area:web, area:diseno
rutas: src/components/sitio/, src/content/profile.ts, src/lib/contact.ts, src/styles/globals.css, src/app/layout.tsx
fecha: 2026-10-15
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
modelo: opus
rol: sesion
---
**Desvíos:** TDD solo para la validación del formulario; la UI va sin test unitario (no hay jsdom) y se verificó con Playwright contra un Chromium que ya estaba en la caché de la máquina, con un script fuera del repo. Abrí el issue sin mostrar borrador porque la persona pidió el PoC directo.
**Decisiones no cubiertas:** con datos reales hubo que decidir qué no mostrar (repos privados, testimonio inexistente, "Experiencia" sin historial laboral → trayectoria de repos). Next 16 con cacheComponents rompe el build con new Date() en una página prerenderizada; el año salió de los datos. check-docs no ve rutas de archivos sin git add.
**Lo que encontró la revisión:** /code-review: 10 hallazgos reales (menú + resize deja sin scroll, sin JS todo invisible, banda sin pausa, radios en conflicto, Escribime sin contorno, data-scroll-behavior de Next 16, foco del menú, duplicados de estilos y colores, handles fijos). Todos corregidos y verificados en el navegador.
**Propuesta:** que implement-issue diga cómo verificar UI cuando no hay tests de componentes (por ejemplo un script de Playwright estándar del repo), y que el mapa sume src/components/** a verificaciones de UI cuando exista jsdom.
