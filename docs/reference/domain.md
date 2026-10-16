# Dominio y datos — Paperfolio

> Entidades, tablas, IDs, estados y sus transiciones.

## Consulta (`consultas`)

Una consulta del formulario de contacto. Modelo: `src/models/Consulta.ts`; servicios: `crearConsulta()` en `src/lib/consultas.ts`, `listarConsultas()` en `src/lib/bandeja.ts` y `obtenerConsulta()`, `cambiarEstado()`, `agregarNota()` , `reservarRespuesta()` y `completarRespuesta()` en `src/lib/seguimiento.ts`, y `responderConsulta()` en `src/lib/respuestas.ts`.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre`, `email`, `mensaje` | string | Ya validados con `parseContactRequest` |
| `tipo` | `general` \| `cotizacion` \| `asesoria` | |
| `estado` | `nueva` \| `en_curso` \| `respondida` \| `archivada` | `nueva` por defecto. Ver las transiciones abajo |
| `emailEnviado` | boolean | `false` por defecto; pasa a `true` cuando sale el aviso por email. Si el aviso falla o vence (8 s), queda en `false` |
| `ipHash` | string | SHA-256 de `IP_HASH_SAL + ip`. La IP en claro no se guarda |
| `creadaEn` | fecha | Timestamp de creación (no hay `updatedAt`) |
| `seguimiento` | array | Historial, vacío por defecto (los documentos de antes de #39 no lo traen y se leen vacío). Cada entrada: `{ tipo: "nota" \| "respuesta" \| "estado", texto, autor (id de `usuarios`), fecha, emailEnviado? }`. En las de tipo `estado`, `texto` es el estado nuevo; `emailEnviado` es de las respuestas (#40) |

**Estados y transiciones** (épica #36, decisión 2, ampliada en #39 con aprobación de @lautioliver; tabla `TRANSICIONES` en `src/lib/estados-consulta.ts`): `nueva → en_curso → respondida → archivada`, más `archivada → en_curso`, `respondida → en_curso` (deshacer un clic de más) y `nueva → archivada` (spam). A `nueva` no se vuelve nunca, y el mismo estado no cuenta como cambio (devuelve "La consulta ya está …"). Un documento con un `estado` desconocido (de antes del enum, editado a mano) o sin el campo se trata como `nueva` (`estadoLeido`): se ve así en la bandeja, entra en su filtro y se puede pasar a `en_curso`. Abrir el detalle de una consulta `nueva` no la cambia: la cambia el operador. `cambiarEstado` es un solo update condicionado al estado de origen, que además agrega la entrada `estado` al seguimiento: una transición inválida (o una consulta que otro operador cambió en el medio) devuelve error y no cambia nada; la acción del panel refresca igual la pantalla para mostrar el estado real. Responder por email (#40) se puede solo desde `en_curso` (`ESTADOS_PARA_RESPONDER`: responder no abre un camino a `respondida` que la tabla no tenga; desde `nueva`, `respondida` o `archivada` no se responde). Antes de enviar se reserva: un solo update condicionado a `en_curso` y a que no haya otra respuesta pendiente agrega la entrada `respuesta` sin `emailEnviado`; un segundo intento simultáneo no matchea y no manda otro email. Una pendiente de más de 2 minutos (`RESERVA_VENCE_MS`: el proceso se cayó a mitad del envío) ya no bloquea. Si el email sale, en un solo update la respuesta pasa a `emailEnviado: true`, se agrega la entrada `estado` y la consulta pasa a `respondida`; si falla o vence el timeout, la respuesta queda con `emailEnviado: false` ("no se pudo confirmar el envío; puede haber llegado": tras un timeout el email puede llegar igual) y el estado no cambia. Si otro operador cambió el estado mientras se enviaba, el email enviado se registra igual y el estado no se pisa. Si el email sale pero falla el registro, la respuesta queda pendiente ("sin confirmar").

Las notas (`agregarNota`) tienen de 1 a 2000 caracteres (`LARGO_MAXIMO_NOTA`), sin contar los espacios de los bordes y con los saltos de línea CRLF del formulario normalizados a LF. El autor de cada entrada sale siempre de la sesión.

Índices: `{ ipHash: 1, creadaEn: -1 }` cuenta las consultas de una IP en la última hora (límite de 5) y `{ creadaEn: -1, _id: -1 }` da el orden de la bandeja. El modelo no los crea al registrarse (`conectar()` usa `bufferCommands: false`): los crea `asegurarIndicesDe(Consulta)` en el primer uso del proceso (`crearConsulta()` y `listarConsultas()`). Si falla, no es fatal en ninguno de los dos: la consulta se guarda y la bandeja responde igual, se loguea solo el nombre del error y se reintenta en el próximo uso.

TODO: completar el resto de las entidades.

## Usuario (`usuarios`)

Modelo: `src/models/Usuario.ts`. Se crea o actualiza en cada ingreso con Google (`registrarIngreso`, `src/lib/usuarios.ts`) y lo administra el admin en `/panel/usuarios` (#49). Ver [ADR-002](../decisions/ADR-002-auth.md) y su enmienda.

| Campo | Tipo | Detalle |
|---|---|---|
| `email` | string | Único, en minúsculas. Es la clave del upsert |
| `nombre` | string | Nombre de la cuenta de Google |
| `imagen` | string | URL del avatar de Google |
| `rol` | `usuario` \| `operador` \| `admin` | El guardado, `usuario` al crearse. Lo cambia el admin desde el panel; el ingreso no lo toca. Es la fuente de verdad de los permisos, más `ADMIN_EMAILS`: esos emails son `admin` siempre, pero ese admin no se guarda (se suma al leer, así sacarlos de la lista lo revoca) |
| `bloqueado` | boolean | `false` por defecto (#49). Bloqueado, no ingresa (callback `signIn`) y sus sesiones abiertas pierden los permisos en el próximo pedido |
| `accesos` | número | `0` por defecto (#49). Lo incrementa con `$inc` el hito 6; el panel solo lo muestra |
| `creadoEn` | fecha | Primer ingreso |
| `ultimoAcceso` | fecha | Último ingreso |

Un documento de antes de #49 no tiene `bloqueado`: su `rol` se había calculado con `ADMIN_EMAILS` y `OPERADOR_EMAILS` en el último ingreso, y puede ser viejo. No se le cree: vale `usuario` (más `ADMIN_EMAILS`) y `normalizarLegados()` lo pasa a `usuario`, sin bloquear y con `accesos` en 0 al ingresar o al abrir el panel de usuarios. Idempotente, sin script ni migración aparte.

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

**Desde el panel (#51):** lo valida `proyectoEntradaEsquema` (`src/lib/proyecto-entrada.ts`, `LIMITES`), que extiende el esquema de lectura para que nada de lo que se guarda lo descarte después el sitio (sin strings vacíos en `stack` ni en `caso`). Largos máximos: `slug` 80 (único, minúsculas, números y guiones), `nombre` 80, `categoria` 60, `descripcion` 300, `stack` de 1 a 10 ítems de hasta 40 caracteres, `caso.problema` y `caso.solucion` 1500, `caso.funcionalidades` hasta 20 ítems de hasta 1500 y `caso.stack` hasta 20 ítems de hasta 40. Un proyecto nuevo va al final del orden; el orden se guarda entero desde la lista.

**Borrar un proyecto borra todas sus demos** (activas o no): una demo sin proyecto no se muestra en el sitio. Se borra primero el proyecto y después las demos; si lo segundo falla, pueden quedar demos huérfanas, que no se muestran (el sitio las busca por proyecto), y el panel lo avisa; en `/panel/demos` aparecen en "Sin proyecto", donde se pueden borrar o pasar a otro proyecto. La imagen de Blob no se borra.

### Demo (`demos`)

Modelo: `src/models/Demo.ts`. Un proyecto puede tener varias; el detalle muestra las activas, cada una en un iframe con sandbox y con el enlace aparte.

| Campo | Tipo | Detalle |
|---|---|---|
| `proyecto` | ObjectId (ref `Proyecto`) | Se borra junto con su proyecto (ver arriba) |
| `titulo` | string | Título del iframe (y encabezado si hay más de una) |
| `url` | string | URL `http` o `https` (nada de `javascript:` ni `data:`). Solo las `https` se embeben; una `http` va como enlace |
| `descripcion` | string | Opcional (`""`) |
| `activa` | boolean | `true` por defecto |
| `orden` | number | `0` por defecto |
| `creadaEn`, `actualizadaEn` | fecha | Timestamps |

Índice `{ proyecto: 1, activa: 1, orden: 1 }`.

**Desde el panel (#50):** la demo va con un proyecto que exista (publicado o no); título de 1 a 80 caracteres, descripción de hasta 300 y URL `https` (el modelo acepta también `http`, ADR-003 R-8, pero el panel no guarda una `http` nueva ni cambia una URL a `http`, así se puede embeber; una demo `http` anterior se edita sin cambiarle la URL: enmienda del 2026-10-16 de ADR-003). El `orden` es por proyecto: una demo nueva, o una que cambia de proyecto, va al final de las de ese proyecto.

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

