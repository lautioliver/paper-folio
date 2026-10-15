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

