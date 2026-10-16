# ADR-003 — Contenido en la base, demos aparte y respaldo estático

## Estado

Aceptado (2026-10-15)

Origen: épica [#46](https://github.com/lautioliver/paper-folio/issues/46) (decisiones 1 y 3, aprobadas por @lautioliver en el chat el 2026-10-15) e issue [#48](https://github.com/lautioliver/paper-folio/issues/48) (schema aprobado por @lautioliver en un comentario del issue).

## Contexto

- Los proyectos (con su caso de estudio, su `demoUrl` y su stack) y los servicios estaban fijos en `src/content/profile.ts`. La consigna (sección 4, promoción) pide un CRUD de proyectos, demos y servicios desde un panel de admin.
- La landing es la cara pública del portfolio: no puede caerse ni ponerse lenta porque la base (MongoDB Atlas M0, compartida) no responda.
- Next 16 con `cacheComponents`: leer de Mongo durante el render vuelve dinámico ese tramo, salvo que la lectura vaya en una caché (`use cache`) o en `Suspense`.
- `next build` corre también sin `MONGODB_URI` (en local y en CI).

## Decisión

1. **Los proyectos, las demos y los servicios viven en la base**, en las colecciones `proyectos`, `demos` y `servicios` (`src/models/`; campos en [domain.md](../reference/domain.md)). El perfil, el stack y la trayectoria siguen estáticos: la consigna no los pide.
2. **Las demos son una colección propia**, vinculada a un proyecto (`proyecto`, ObjectId). Un proyecto puede tener varias o ninguna; el detalle muestra las activas (`activa: true`), en orden.
3. **El sitio muestra solo lo publicado** (`publicado: true` en proyectos y servicios; `activa: true` en demos). Un proyecto despublicado no aparece en la landing ni en `/proyectos`, y su detalle da 404.
4. **El sitio lee el contenido solo por `src/lib/contenido.ts`** (`listarProyectos`, `detalleProyecto`, `listarServicios`; el detalle lee el proyecto y sus demos juntos, así no mezcla la base con el respaldo), que valida cada documento con Zod antes de mostrarlo: lo que no pasa (por ejemplo, una URL que no es `http(s)`) se descarta.
5. **Respaldo estático:** si la colección está vacía (no se corrió el seed) o la base falla, esas funciones devuelven el contenido de `src/content/profile.ts` y loguean solo el nombre del error (el mensaje del driver puede traer la URI). Si la colección tiene documentos pero ninguno publicado, el resultado es vacío: el respaldo no reaparece.
6. **Caché:** las funciones de lectura usan `use cache` con `cacheTag("contenido")` y `cacheLife("hours")` cuando leyeron de la base, o `cacheLife("minutes")` cuando usaron el respaldo. Así la landing y `/proyectos` siguen prerenderizadas (PPR) y una base que vuelve se nota en un minuto. Quien edite el contenido (el panel) invalida con `updateTag("contenido")` (`TAG_CONTENIDO`).
7. **Carga inicial con `npm run seed:contenido`**, idempotente: inserta lo que falta (proyectos por `slug`, servicios por `titulo`, la demo de cada proyecto solo si no tiene ninguna) y nunca modifica un documento existente (ni sus fechas), así no pisa lo editado en el panel. Lo corre una persona; ningún agente lo corre contra la base compartida. Antes de escribir muestra el host y la base, y con un host de Atlas se niega salvo `--atlas`.
8. **URLs:** `repoUrl` e `imagen` solo `https`; la `url` de una demo, `http` o `https` (solo las `https` se embeben en el iframe; una `http` va como enlace). Se valida en el modelo y otra vez al leer.

## Alternativas descartadas

- **Seguir con `profile.ts` y editarlo por PR:** no cumple la consigna (CRUD desde el panel).
- **Las demos como campo del proyecto (`demoUrl`):** no permite varias demos por proyecto ni activarlas o desactivarlas sin tocar el proyecto (decisión 1 de la épica).
- **Leer de la base sin respaldo, con error si falla:** la landing se caería con la base, y el build sin `MONGODB_URI` fallaría.
- **Leer en `Suspense` sin caché:** la landing pasaría a consultar Mongo en cada visita, con un fallback de carga visible; `use cache` deja el contenido en el shell estático.
- **Una caché remota (`use cache: remote`):** costo y configuración extra en Vercel para un contenido que cambia pocas veces al día.

## Consecuencias

- La landing no depende de la base para responder: sirve el shell prerenderizado y regenera en segundo plano.
- Una edición en la base que no pase por el panel (por ejemplo, el seed) tarda hasta `revalidate` en verse: un minuto si el sitio venía del respaldo, una hora si ya leía de la base. El panel no tiene esa demora porque invalida el tag.
- Si la base falla, se ve el contenido estático, que puede no coincidir con lo editado (por ejemplo, un proyecto despublicado vuelve a verse hasta que la base responda).
- Renombrar un slug o un título desde el panel, o borrar todas las demos de un proyecto, y volver a correr el seed recarga el original de `profile.ts`.
- Pendiente: el CRUD del panel (C3 a C5 de la épica #46), que tiene que crear los índices con `asegurarIndicesDe()` y llamar a `updateTag(TAG_CONTENIDO)` al guardar.
