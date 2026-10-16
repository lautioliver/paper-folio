# Dominio y datos — Paperfolio

> Entidades, tablas, IDs, estados y sus transiciones.

## Consulta (`consultas`)

Una consulta del formulario de contacto. Modelo: `src/models/Consulta.ts`; servicio: `crearConsulta()` en `src/lib/consultas.ts`.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `email`, `mensaje` | string | Ya validados con `parseContactRequest` |
| `tipo` | `general` \| `cotizacion` \| `asesoria` | |
| `estado` | string | `nueva` por defecto. Los demás estados los define el panel del operador (hito 4) |
| `emailEnviado` | boolean | `false` por defecto; pasa a `true` cuando sale el aviso por email. Si el aviso falla o vence (8 s), queda en `false` |
| `ipHash` | string | SHA-256 de `IP_HASH_SAL + ip`. La IP en claro no se guarda |
| `creadaEn` | fecha | Timestamp de creación (no hay `updatedAt`) |

Índice `{ ipHash: 1, creadaEn: -1 }`: cuenta las consultas de una IP en la última hora (límite de 5). El modelo no crea el índice al registrarse (`conectar()` usa `bufferCommands: false`): lo crea `crearConsulta()` en el primer uso del proceso.

TODO: completar el resto de las entidades.

## Usuario (`usuarios`)

Modelo: `src/models/Usuario.ts`. Se crea o actualiza en cada ingreso con Google (`registrarIngreso`, `src/lib/usuarios.ts`). Ver [ADR-002](../decisions/ADR-002-auth.md).

| Campo | Tipo | Detalle |
|---|---|---|
| `email` | string | Único, en minúsculas. Es la clave del upsert |
| `nombre` | string | Nombre de la cuenta de Google |
| `imagen` | string | URL del avatar de Google |
| `rol` | `usuario` \| `operador` \| `admin` | Se recalcula en cada ingreso con `ADMIN_EMAILS` y `OPERADOR_EMAILS`. Es la fuente de verdad de los permisos |
| `creadoEn` | fecha | Primer ingreso |
| `ultimoAcceso` | fecha | Último ingreso |

## Contenido administrable: `proyectos`, `demos` y `servicios`

Los edita el admin desde el panel (C3 a C5 de la épica #46); el sitio los lee con `src/lib/contenido.ts`, que muestra solo lo publicado o activo y, si la colección está vacía o la base falla, usa el contenido estático de `src/content/profile.ts`. Ver [ADR-003](../decisions/ADR-003-contenido-en-la-base.md). La carga inicial es `npm run seed:contenido` ([setup.md](../development/setup.md)). Las URLs se validan en el modelo y otra vez al leer (lo que no pasa no se muestra).

### Proyecto (`proyectos`)

Modelo: `src/models/Proyecto.ts`.

| Campo | Tipo | Detalle |
|---|---|---|
| `slug` | string | Único (índice), minúsculas, números y guiones. Es la URL pública (`/proyectos/<slug>`) |
| `nombre`, `inicial`, `categoria`, `descripcion` | string | `inicial`: 1 o 2 caracteres (el cuadrado de color de la tarjeta) |
| `stack` | string[] | Tecnologías de la tarjeta |
| `repoUrl` | string | URL `https` |
| `acento` | `primario` \| `acento` \| `secundario` \| `terciario` | Tono de la tarjeta (`src/components/sitio/tones.ts`) |
| `caso` | `{ problema, solucion, funcionalidades[], stack[] }` | Caso de estudio del detalle |
| `imagen` | string (opcional) | URL `https`; la sube el panel (#47) |
| `orden` | number | Orden en la landing y en `/proyectos` (de menor a mayor). `0` por defecto |
| `publicado` | boolean | `false` por defecto. Despublicado: no aparece en la landing ni en `/proyectos`, y su detalle da 404 |
| `creadoEn`, `actualizadoEn` | fecha | Timestamps |

### Demo (`demos`)

Modelo: `src/models/Demo.ts`. Un proyecto puede tener varias; el detalle muestra las activas, cada una en un iframe con sandbox y con el enlace aparte.

| Campo | Tipo | Detalle |
|---|---|---|
| `proyecto` | ObjectId (ref `Proyecto`) | |
| `titulo` | string | Título del iframe (y encabezado si hay más de una) |
| `url` | string | URL `http` o `https` (nada de `javascript:` ni `data:`). Solo las `https` se embeben; una `http` va como enlace |
| `descripcion` | string | Opcional (`""`) |
| `activa` | boolean | `true` por defecto |
| `orden` | number | `0` por defecto |
| `creadaEn`, `actualizadaEn` | fecha | Timestamps |

Índice `{ proyecto: 1, activa: 1, orden: 1 }`.

### Servicio (`servicios`)

Modelo: `src/models/Servicio.ts`.

| Campo | Tipo | Detalle |
|---|---|---|
| `titulo` | string | Único (índice): el seed es idempotente por título |
| `descripcion` | string | |
| `icono` | `frontend` \| `backend` \| `database` \| `integrations` \| `deploy` | Uno de los íconos SVG actuales (`SERVICE_ICONS`). Obligatorio si no hay `imagen` |
| `imagen` | string (opcional) | URL `https`, en lugar del ícono |
| `orden`, `publicado` | number, boolean | Como en Proyecto |
| `creadoEn`, `actualizadoEn` | fecha | Timestamps |

Los índices no se crean al registrar los modelos (`autoIndex: false`): los crea `asegurarIndicesDe()` quien escribe (el seed y, después, el panel).

