# Dominio y datos — Paperfolio

> Entidades, tablas, IDs, estados y sus transiciones.

## Consulta (`consultas`)

Una consulta del formulario de contacto. Modelo: `src/models/Consulta.ts`; servicios: `crearConsulta()` en `src/lib/consultas.ts`, `listarConsultas()` en `src/lib/bandeja.ts` y `obtenerConsulta()`, `cambiarEstado()` y `agregarNota()` en `src/lib/seguimiento.ts`.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `email`, `mensaje` | string | Ya validados con `parseContactRequest` |
| `tipo` | `general` \| `cotizacion` \| `asesoria` | |
| `estado` | `nueva` \| `en_curso` \| `respondida` \| `archivada` | `nueva` por defecto. Ver las transiciones abajo |
| `emailEnviado` | boolean | `false` por defecto; pasa a `true` cuando sale el aviso por email. Si el aviso falla o vence (8 s), queda en `false` |
| `ipHash` | string | SHA-256 de `IP_HASH_SAL + ip`. La IP en claro no se guarda |
| `creadaEn` | fecha | Timestamp de creación (no hay `updatedAt`) |
| `seguimiento` | array | Historial, vacío por defecto (los documentos de antes de #39 no lo traen y se leen vacío). Cada entrada: `{ tipo: "nota" \| "respuesta" \| "estado", texto, autor (id de `usuarios`), fecha, emailEnviado? }`. En las de tipo `estado`, `texto` es el estado nuevo; `emailEnviado` es de las respuestas (#40) |

**Estados y transiciones** (épica #36, decisión 2; tabla `TRANSICIONES` en `src/lib/estados-consulta.ts`): `nueva → en_curso → respondida → archivada`, y `archivada → en_curso`. A `nueva` no se vuelve nunca, y el mismo estado no cuenta como cambio. Abrir el detalle de una consulta `nueva` no la cambia: la cambia el operador. `cambiarEstado` es un solo update condicionado al estado de origen, que además agrega la entrada `estado` al seguimiento: una transición inválida (o una consulta que otro operador cambió en el medio) devuelve error y no cambia nada. Responder por email (#40) la pasa a `respondida`.

Las notas (`agregarNota`) tienen de 1 a 2000 caracteres, sin contar los espacios de los bordes. El autor de cada entrada sale siempre de la sesión.

Índices: `{ ipHash: 1, creadaEn: -1 }` cuenta las consultas de una IP en la última hora (límite de 5) y `{ creadaEn: -1, _id: -1 }` da el orden de la bandeja. El modelo no los crea al registrarse (`conectar()` usa `bufferCommands: false`): los crea `asegurarIndicesDe(Consulta)` en el primer uso del proceso (`crearConsulta()` y `listarConsultas()`).

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

