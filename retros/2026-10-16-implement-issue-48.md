---
skill: implement-issue
issue: 48
pr: 60
area: area:web, area:db
rutas: src/models, src/lib/contenido.ts, src/lib/seed-contenido.ts, scripts/seed-contenido.ts, scripts/ts-hooks.mjs, src/app/(sitio)/proyectos, src/components/sitio/Sections.tsx, docs
skill_sha: 854569dd2b7a8f0d21673ef6b2052b2dfb3a7c2b
fecha: 2026-10-16
modelo: opus
rol: implementador
agente_sha: 54b06d3c7c192cfc521bea1a002dd7046aca7207
---
**Desvíos:** corrió en Opus (Sonnet agotado), con frontmatter `modelo: opus`. El commit de tests en rojo no pasaba typecheck (tipos de los propios tests); se arregló en el de la implementación y se dijo en el PR. La corrida se pausó a mitad por la persona y se retomó sin pérdida.
**Decisiones no cubiertas:** cómo mantener la landing estática leyendo de Mongo con cacheComponents (use cache + cacheTag + cacheLife condicional: hours desde la base, minutes en el respaldo); colección vacía = respaldo, pero despublicado todo = vacío; cómo correr un script TS sin agregar dependencias (type stripping de Node + hooks propios para `@/` y extensiones); la regla de idempotencia de las demos (solo si el proyecto no tiene ninguna); http en demos solo como enlace. `cacheLife` no acepta un ternario de strings (overloads): hay que ramificar.
**Lo que encontró la revisión:** /code-review: el upsert con `$setOnInsert` igual tocaba `actualizadoEn` por los timestamps de Mongoose (y el test de idempotencia lo ocultaba al excluir las fechas); el detalle podía mezclar base y respaldo al leer proyecto y demos en dos cachés separadas; demo http en iframe (contenido mixto); esquema de lectura sin la regla ícono-o-imagen. Seguridad a mano: sin hallazgos (slug validado antes de consultar, URLs validadas en modelo y al leer, logs solo con el nombre del error, detalle gateado antes de leer).
**Propuesta:** en lecciones: "con Mongoose timestamps, un upsert con solo `$setOnInsert` igual escribe `updatedAt`; para un seed que no pisa, `timestamps: false` y los tests de idempotencia sin excluir fechas".
