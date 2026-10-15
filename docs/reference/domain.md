# Dominio y datos — Paperfolio

> Entidades, tablas, IDs, estados y sus transiciones.

## Consulta (`consultas`)

Una consulta del formulario de contacto. Modelo: `src/models/Consulta.ts`; servicio: `crearConsulta()` en `src/lib/consultas.ts`.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `email`, `mensaje` | string | Ya validados con `parseContactRequest` |
| `tipo` | `general` \| `cotizacion` \| `asesoria` | |
| `estado` | string | `nueva` por defecto. Los demás estados los define el panel del operador (hito 4) |
| `emailEnviado` | boolean | `false` por defecto; pasa a `true` si el aviso por email salió |
| `ipHash` | string | SHA-256 de `IP_HASH_SAL + ip`. La IP en claro no se guarda |
| `creadaEn` | fecha | Timestamp de creación (no hay `updatedAt`) |

Índice `{ ipHash: 1, creadaEn: -1 }`: cuenta las consultas de una IP en la última hora (límite de 5). El modelo no crea el índice al registrarse (`conectar()` usa `bufferCommands: false`): lo crea `crearConsulta()` en el primer uso del proceso.

TODO: completar el resto de las entidades.
