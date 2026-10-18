# Auditoría de UI y UX: panel de operador y admin

Issue #81. Fecha: 2026-10-18. Código auditado: `main` en `8181d60`.

Lista priorizada de mejoras de interfaz y experiencia del panel (`/panel/**`). No cambia código: cada hallazgo propone un arreglo y la tabla del final agrupa los hallazgos en issues para pasarlos a GitHub con `crear-issue`, después de revisarlos.

## 1. Alcance y método

**Páginas y componentes revisados**

| Sección | Archivos |
|---|---|
| Layout y navegación | `src/app/panel/layout.tsx`, `src/app/panel/page.tsx`, `src/components/panel/` (`PanelShell`, `EnlacesPanel`, `enlaces`, `ChipEstado`), `src/app/forbidden.tsx`, `src/app/layout.tsx` |
| Operador: consultas | `src/app/panel/consultas/page.tsx` y la carpeta del detalle, `src/app/panel/consultas/[id]/` (página, `detalle`, `controles`, `acciones`) |
| Admin: proyectos | `src/app/panel/proyectos/` (lista, formulario, acciones, alta en `nuevo/` y edición en `[id]/`) |
| Admin: demos | `src/app/panel/demos/` (lista, formulario, botón de borrar, acciones, alta en `nueva/` y edición en `[id]/`) |
| Admin: servicios | `src/app/panel/servicios/` (lista, formulario, botón de borrar, acciones, subida, alta en `nuevo/` y edición en `[id]/`) |
| Admin: usuarios | `src/app/panel/usuarios/` (página, acciones, ruta y avisos) |
| Admin: métricas | `src/app/panel/metricas/` (página, gráficos y ruta) |

**Método**

- Todo el panel exige sesión, así que se auditó **solo desde el código**: no se miró en producción ni se levantó `next dev`. Lo que depende del render real (cortes de línea, desbordes a 360 px) queda marcado como "verificar en el navegador".
- Fuentes: el código de arriba, los tokens del manual en `src/styles/globals.css` (el issue los ubica en `src/app/globals.css`; viven en `src/styles/`), las superficies de `docs/reference/surfaces.md` y los recorridos de `docs/reference/journeys.md`.
- Criterios: jerarquía y legibilidad, consistencia con el manual (tokens, `contorno`, `marca`, `apretable`, Onest), estados (vacío, cargando, error, éxito, deshabilitado), microcopy en rioplatense, formularios (labels, errores, foco), navegación y orientación, responsive, accesibilidad (WCAG 2.2 AA) y movimiento (`prefers-reduced-motion`).
- Los contrastes se calcularon con la fórmula de WCAG sobre los HEX de `globals.css`: `secundario` (#477fef) sobre `papel` da 3,78:1; `acento` (#ed747e) sobre `papel`, 2,84:1; `tinta` sobre `primario`, 11,35:1.
- Gravedad: **alta**, impide una tarea o rompe la accesibilidad; **media**, confunde o es inconsistente con el manual; **baja**, pulido.

**Qué ve cada rol.** El operador ve un menú con "Consultas" y "Volver al sitio" (`src/components/panel/enlaces.ts:8`); el admin suma Proyectos, Demos, Servicios, Usuarios y Métricas (`enlaces.ts:9-13`). `/panel` lleva a Consultas para los dos (`src/app/panel/page.tsx:5`). Si un operador escribe a mano la URL de una sección de admin, recibe el 403 (ver UX-PANEL-27).

## 2. Hallazgos

### Alta

#### UX-PANEL-01 — El chip "En curso" no llega al contraste mínimo

- **Página:** `/panel/consultas` y `/panel/consultas/[id]`.
- **Dónde:** `src/components/panel/ChipEstado.tsx:5` (`bg-secundario text-papel`) y `:13` (`text-pequeno font-bold`).
- **Qué pasa:** texto blanco sobre `secundario` da 3,78:1. A 14 px en negrita no es texto grande (hace falta 18,66 px en negrita), así que necesita 4,5:1.
- **Por qué importa:** WCAG 1.4.3. El estado es el dato con el que el operador decide qué atender primero, y aparece en cada fila de la bandeja.
- **Propuesta:** `bg-secundario text-tinta` (tinta sobre #477fef da 5,2:1) o pasar el chip a `bg-terciario text-papel` (4,55:1, justo). La primera mantiene el color del manual sin cambiar el token.

#### UX-PANEL-02 — El selector de ícono de los servicios no muestra el foco

- **Página:** `/panel/servicios/nuevo` y `/panel/servicios/[id]`.
- **Dónde:** `src/app/panel/servicios/formulario.tsx:149-159`.
- **Qué pasa:** cada opción es un `<input type="radio" className="sr-only">` dentro de un `<label>` que se pinta con `has-checked:bg-primario`. El anillo de `:focus-visible` (`src/styles/globals.css:73-76`) cae sobre el radio, que mide 1 px y está recortado, y el label no tiene estilo de foco. Con el teclado no se ve cuál de los cinco íconos tiene el foco hasta elegirlo con las flechas (y eso ya lo marca).
- **Por qué importa:** WCAG 2.4.7 (foco visible). Un admin que usa teclado no puede saber dónde está.
- **Propuesta:** sumar al label `has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-secundario`, así el anillo es el mismo del resto del sitio.

#### UX-PANEL-03 — En demos y servicios, publicar, mover y borrar fallan en silencio

- **Página:** `/panel/demos` y `/panel/servicios`.
- **Dónde:** `src/app/panel/demos/acciones.ts:53-70` y `src/app/panel/servicios/acciones.ts:59-77` (devuelven `void` y descartan el `ResultadoDemo`/`ResultadoServicio`); los botones en `src/app/panel/demos/page.tsx:59-84` y `src/app/panel/servicios/page.tsx:56-79`.
- **Qué pasa:** si el servicio responde con error (la demo ya no existe, la base falló a medias, otro admin la movió), la acción refresca y no dice nada. Los botones tampoco se deshabilitan mientras corre la acción: un doble clic en "Subir" sube dos lugares.
- **Por qué importa:** el admin cree que publicó o borró algo que sigue igual, y lo descubre recién en el sitio. En proyectos el mismo caso sí avisa (`src/app/panel/proyectos/lista.tsx:66-67`, `:154`).
- **Propuesta:** el patrón de proyectos: `useActionState` con `{ error }`, un mensaje `aria-live` por lista y `disabled` mientras la acción está pendiente (o `useFormStatus` en un botón cliente compartido).

### Media

#### UX-PANEL-04 — Guardar un proyecto, una demo o un servicio no confirma nada

- **Página:** formularios de alta y edición de proyectos, demos y servicios.
- **Dónde:** `src/app/panel/proyectos/acciones.ts:25-28`, `src/app/panel/demos/acciones.ts:48-49`, `src/app/panel/servicios/acciones.ts:55-56` (redirigen a la lista sin aviso).
- **Qué pasa:** después de "Guardar" se vuelve a la lista como si nada. No hay un "Listo: guardamos «X»" ni se resalta la fila.
- **Por qué importa:** sin confirmación, el admin vuelve a abrir el ítem para comprobar que se guardó. Usuarios ya resuelve esto con un aviso por código en la URL (`src/app/panel/usuarios/page.tsx:78-85`, `src/app/panel/usuarios/ruta.ts:8-17`), así que además es inconsistente dentro del panel.
- **Propuesta:** reusar el patrón de usuarios: `redirect` a la lista con `?aviso=creado|guardado` y un `<p role="status">` arriba de la lista con el texto de una tabla fija.

#### UX-PANEL-05 — En el detalle de una consulta, el resultado de cada acción queda fuera de la vista

- **Página:** `/panel/consultas/[id]`.
- **Dónde:** `src/app/panel/consultas/[id]/controles.tsx:19-26` (solo hay mensaje de error), `src/app/panel/consultas/[id]/acciones.ts:23-28`, y el orden de `src/app/panel/consultas/[id]/detalle.tsx:91-120` (controles y después el seguimiento, que crece hacia abajo porque `src/lib/seguimiento.ts:141`, `:186` y `:238` agregan con `$push`).
- **Qué pasa:** al cambiar el estado, guardar una nota o enviar la respuesta, la entrada nueva aparece al final de la página, debajo de los tres formularios. En celular queda varias pantallas más abajo. El lector de pantalla no anuncia nada cuando sale bien.
- **Por qué importa:** el operador no sabe si la nota se guardó o si el email salió sin hacer scroll; con una respuesta por email, la duda lleva a mandarla dos veces.
- **Propuesta:** devolver también un `ok` en `EstadoAccion` y mostrar "Listo: guardamos la nota" / "Listo: enviamos la respuesta" en el mismo `MensajeError` (renombrado a `Mensaje`). Evaluar mostrar el seguimiento de lo más nuevo a lo más viejo, o arriba de los controles.

#### UX-PANEL-06 — Los errores de los formularios no se distinguen ni reciben el foco

- **Página:** todos los formularios del panel.
- **Dónde:** `src/app/panel/proyectos/formulario.tsx:24-31` (el error va en `font-normal text-tinta`, igual que la ayuda de `:54`) y `:340-342` (el error general va abajo de todo, junto al botón); `src/app/panel/demos/formulario.tsx:14-21`; `src/app/panel/servicios/formulario.tsx:24-31`; `src/app/panel/consultas/[id]/controles.tsx:19-26`.
- **Qué pasa:** el texto del error tiene el mismo color, tamaño y peso que la ayuda (en proyectos) o que un label (en el resto). Los campos con `aria-invalid` no cambian de aspecto. Después de un envío fallido el foco queda en el botón: en el formulario de proyectos (16 campos), el error del slug queda dos pantallas más arriba.
- **Por qué importa:** WCAG 3.3.1 pide identificar el error, y verlo es parte de eso. Hoy hay que leer el formulario entero para encontrar qué falló.
- **Propuesta:** un estilo de error único del panel (por ejemplo, un ícono o el prefijo "Error:" en negrita, y `aria-invalid:border-acento` en el campo, sin hex nuevos) y, si el envío falla, mover el foco al primer campo inválido o a un resumen arriba con enlaces a cada campo.

#### UX-PANEL-07 — Las confirmaciones de acciones destructivas usan dos patrones

- **Página:** `/panel/proyectos`, `/panel/demos`, `/panel/servicios`, `/panel/consultas/[id]`.
- **Dónde:** `window.confirm` en `src/app/panel/demos/boton-borrar.tsx:17`, `src/app/panel/servicios/boton-borrar.tsx:17` y `src/app/panel/consultas/[id]/controles.tsx:96`; confirmación en línea en `src/app/panel/proyectos/lista.tsx:133-151`.
- **Qué pasa:** borrar un proyecto muestra una confirmación con la marca ("Sí, borrar" / "Cancelar"); borrar una demo o un servicio, o enviar una respuesta, abre el diálogo nativo del navegador, sin estilo, con los botones en el idioma del sistema ("OK"/"Cancel" en un navegador en inglés).
- **Por qué importa:** inconsistente con el manual y entre secciones. El diálogo nativo además se puede bloquear ("no mostrar más diálogos"), y entonces el `confirm` devuelve `false` y el botón deja de andar sin decir por qué.
- **Propuesta:** un componente `ConfirmarAccion` del panel basado en el de proyectos (o en `<dialog>` con `showModal()`, que maneja el foco solo), usado por las cuatro.

#### UX-PANEL-08 — La confirmación en línea de proyectos pierde el foco

- **Página:** `/panel/proyectos`.
- **Dónde:** `src/app/panel/proyectos/lista.tsx:133-151`.
- **Qué pasa:** "Borrar" se reemplaza por el formulario de confirmación y "Cancelar" vuelve a mostrar "Borrar". En los dos casos el botón que tenía el foco desaparece del DOM y el foco cae en el `<body>`: con teclado o lector de pantalla hay que volver a recorrer la página desde arriba.
- **Por qué importa:** WCAG 2.4.3 (orden del foco). La pregunta "¿Borrar «X»?" tampoco se anuncia.
- **Propuesta:** al abrir, mover el foco al texto de la pregunta (con `tabIndex={-1}`) o a "Cancelar"; al cancelar, devolverlo a "Borrar". Si se adopta `<dialog>` (UX-PANEL-07), lo resuelve.

#### UX-PANEL-09 — Cambiar el rol o bloquear una cuenta es un clic sin confirmación

- **Página:** `/panel/usuarios`.
- **Dónde:** `src/app/panel/usuarios/page.tsx:35-55`.
- **Qué pasa:** "Hacer admin" y "Bloquear" corren apenas se tocan. Los botones están juntos y son del mismo tamaño y estilo, en una lista de 20 por página.
- **Por qué importa:** un clic errado le da todos los permisos a un desconocido o deja afuera a un operador, y vale "al instante, también en las sesiones abiertas" (`page.tsx:74-75`). Borrar una demo pide confirmación y esto, que es más delicado, no.
- **Propuesta:** confirmar "Hacer admin" y "Bloquear" con el componente de UX-PANEL-07, con el email en la pregunta. "Hacer usuario/operador" y "Desbloquear" pueden seguir directos.

#### UX-PANEL-10 — Las tres listas del contenido se comportan distinto

- **Página:** `/panel/proyectos`, `/panel/demos`, `/panel/servicios` y sus formularios.
- **Dónde:**
  - Estado: texto suelto "Publicado / Sin publicar" en `src/app/panel/proyectos/lista.tsx:76`; chip "Activa / Inactiva" en `src/app/panel/demos/page.tsx:48-50`; chip "Publicado / Borrador" en `src/app/panel/servicios/page.tsx:47-51`.
  - Subir y bajar: se ocultan en los extremos en `proyectos/lista.tsx:78-87`; se deshabilitan en `demos/page.tsx:60,68` y `servicios/page.tsx:57,65`, con `disabled:opacity-40` (`demos/page.tsx:12`, `servicios/page.tsx:10`) contra `opacity-60` en el resto del panel.
  - Botón de guardar: "Crear proyecto" / "Guardar cambios" (`proyectos/formulario.tsx:345`) contra "Guardar" (`demos/formulario.tsx:164`, `servicios/formulario.tsx:199`).
  - Título de edición: "Editar «nombre»" (`proyectos/[id]/editar.tsx:15`) contra "Editar demo" (`demos/[id]/page.tsx:20`) y "Editar servicio" (`servicios/[id]/page.tsx:16`).
  - Casilla: `size-5` en `proyectos/formulario.tsx:307`, tamaño por defecto en `demos/formulario.tsx:158` y `servicios/formulario.tsx:193`.
- **Por qué importa:** son la misma tarea (ordenar, publicar, editar, borrar) en tres pantallas vecinas. Cada diferencia obliga a releer la pantalla, y "Sin publicar" y "Borrador" parecen dos estados distintos.
- **Propuesta:** un chip de estado del panel (como `ChipEstado`, con `bg-primario` para lo visible y `bg-superficie` para lo oculto), el mismo criterio para las flechas (ocultar en los extremos, como proyectos, deja menos ruido) y los mismos textos: "Publicado / Sin publicar", "Crear …" / "Guardar cambios" y "Editar «nombre»".

#### UX-PANEL-11 — El panel no tiene pantallas propias de carga, error ni 404

- **Página:** todo `/panel`.
- **Dónde:** no hay `loading.tsx`, `error.tsx` ni `not-found.tsx` en `src/app/` (solo `src/app/forbidden.tsx`). `src/app/panel/layout.tsx:31` usa `<Suspense fallback={null}>`. Llaman a `notFound()` `src/app/panel/consultas/[id]/detalle.tsx:49`, `src/app/panel/proyectos/[id]/editar.tsx:12`, `src/app/panel/demos/[id]/page.tsx:16` y `src/app/panel/servicios/[id]/page.tsx:13`. `src/app/panel/proyectos/acciones.ts:68` vuelve a lanzar el error de la base.
- **Qué pasa:** mientras se lee la sesión, la pantalla queda en blanco (sin el menú). Un id que no existe muestra la 404 por defecto de Next, en inglés y sin la marca. Si Mongo falla, aparece la página de error genérica de Next ("Application error…"), sin forma de volver al panel.
- **Por qué importa:** son justo los momentos en que el operador necesita orientarse. Un enlace viejo a una consulta borrada lo deja en una página en otro idioma, fuera del panel.
- **Propuesta:** un `not-found.tsx` en la carpeta del panel ("No encontramos esa consulta o ese contenido" con un enlace a la sección), un `error.tsx` en la misma carpeta (cliente, con "Probá de nuevo" que llame a `reset` y el enlace a Consultas) y un esqueleto del shell como fallback del layout. La 404 y el error del sitio público conviene resolverlos junto con la auditoría transversal de UI y UX.

#### UX-PANEL-12 — Varias pestañas se llaman igual y ninguna dice de qué sitio es

- **Página:** todo `/panel`.
- **Dónde:** `src/app/layout.tsx:12-15` (título fijo, sin `template`); `src/app/panel/layout.tsx:7-11` ("Panel"). No exportan `metadata`: `src/app/panel/consultas/page.tsx`, `src/app/panel/servicios/page.tsx`, `src/app/panel/servicios/nuevo/page.tsx`, `src/app/panel/servicios/[id]/page.tsx` y `src/app/panel/usuarios/page.tsx`.
- **Qué pasa:** la bandeja, los tres de servicios y usuarios se ven como "Panel" en la pestaña y en el historial; el resto, como "Proyectos" o "Consulta" a secas.
- **Por qué importa:** WCAG 2.4.2. Con varias pestañas del panel abiertas no se distinguen, y el lector de pantalla anuncia "Panel" en cada navegación.
- **Propuesta:** `title: { default: "Panel", template: "%s · Panel · Paperfolio" }` en el layout del panel y un `metadata.title` en cada página que falta ("Consultas", "Servicios", "Nuevo servicio", "Editar servicio", "Usuarios"). El detalle de una consulta puede usar `generateMetadata` con el nombre de quien escribió.

#### UX-PANEL-13 — El panel no dice con qué cuenta se entró ni permite salir

- **Página:** todo `/panel`.
- **Dónde:** `src/components/panel/PanelShell.tsx:10-30` (solo "Panel", las secciones y "Volver al sitio"); el menú de cuenta vive solo en el sitio (`src/components/sitio/MenuCuenta.tsx`).
- **Qué pasa:** no se ve el nombre, el email ni el rol de la sesión, y para cerrar sesión hay que volver al sitio y abrir el menú de cuenta.
- **Por qué importa:** un admin que prueba con una cuenta de operador (o al revés) no sabe cuál tiene abierta, y en una compu compartida cerrar la sesión no es evidente.
- **Propuesta:** en la barra lateral, debajo de "Panel", el nombre y el rol ("Operador" / "Admin") y un botón "Salir" que use la misma acción que `MenuCuenta`. En la barra inferior, un enlace "Cuenta" o el mismo "Salir" al final.

#### UX-PANEL-14 — Falta un enlace para saltar el menú en escritorio

- **Página:** todo `/panel` desde 1024 px.
- **Dónde:** `src/components/panel/PanelShell.tsx:14-20` (el `<aside>` va antes de `<main>`).
- **Qué pasa:** con teclado, el admin pasa por las seis secciones y "Volver al sitio" (siete tabulaciones) antes de llegar al contenido de cada página. En celular la barra va después de `<main>` y no pasa.
- **Por qué importa:** WCAG 2.4.1 (saltar bloques). En la bandeja se repite en cada consulta que se abre.
- **Propuesta:** un "Saltar al contenido" visible al recibir el foco, primero en el shell, que lleve a `<main id="contenido" tabIndex={-1}>`.

#### UX-PANEL-15 — Métricas no tiene estado vacío

- **Página:** `/panel/metricas`.
- **Dónde:** `src/app/panel/metricas/page.tsx:149-236` y `src/app/panel/metricas/graficos.tsx:71-154`.
- **Qué pasa:** sin datos en el rango (un deploy nuevo, un filtro de tipo sin consultas), las tarjetas muestran 0 y cada gráfico dibuja los ejes vacíos o una línea plana en 0. No hay un texto que diga que no hubo actividad.
- **Por qué importa:** un gráfico vacío parece una falla de carga. El resumen ("0 consultas del …") ayuda, pero queda chico al lado del gráfico.
- **Propuesta:** si el total de la sección es 0, reemplazar el gráfico por un recuadro `contorno bg-superficie` con "No hubo consultas en estos días" (y dejar la tabla). Es el mismo criterio que usan la bandeja (`src/app/panel/consultas/page.tsx:96-101`) y usuarios.

#### UX-PANEL-16 — Para responder una consulta hay que cambiar el estado antes

- **Página:** `/panel/consultas/[id]`.
- **Dónde:** `src/app/panel/consultas/[id]/controles.tsx:124-128`; la regla, en `src/lib/estados-consulta.ts:45` (`ESTADOS_PARA_RESPONDER = ["en_curso"]`).
- **Qué pasa:** en una consulta nueva, el formulario de respuesta no aparece: se lee "Para responder por email, pasá la consulta a En curso", hay que ir al formulario de estado de arriba, cambiarlo, esperar el refresco y recién ahí escribir.
- **Por qué importa:** es el recorrido principal del operador y suma un paso que no aporta. El texto no enlaza ni lleva al control.
- **Propuesta (sin cambiar la regla):** en lugar del texto, un botón "Pasar a En curso y responder" que corra la transición y muestre el formulario. La regla sigue igual (se responde en curso), así que no hace falta `logica-negocio`. Si se prefiere responder desde Nueva sin pasar por En curso, eso sí cambia la regla y se consulta aparte.

### Baja

#### UX-PANEL-17 — Hay jerga interna en la interfaz

- **Dónde:** "ADR-003" en `src/app/panel/proyectos/page.tsx:33-34`; "ADMIN_EMAILS" en `src/app/panel/usuarios/page.tsx:56` y `src/app/panel/usuarios/ruta.ts:13`; "Aviso interno: No se pudo enviar" en `src/app/panel/consultas/[id]/detalle.tsx:79-80`; "Hacer usuario" en `src/app/panel/usuarios/page.tsx:40`.
- **Qué pasa:** nombres de ADR y de variables de entorno, y textos que no dicen qué pasó ("Aviso interno" es el email a la casilla del dueño; "Hacer usuario" es quitarle permisos).
- **Propuesta:** "el sitio vuelve a mostrar el contenido de respaldo"; "Es admin por configuración del sitio: no se puede cambiar desde acá"; "Aviso a tu casilla: enviado / no se pudo enviar"; "Pasar a usuario / operador / admin".

#### UX-PANEL-18 — Botones de fila sin nombre propio en proyectos y servicios

- **Dónde:** `src/app/panel/proyectos/lista.tsx:126-136` (Publicar, Editar, Borrar); `src/app/panel/servicios/page.tsx:72-78` (Publicar, Editar) y `src/app/panel/servicios/boton-borrar.tsx:20` (Borrar).
- **Qué pasa:** en la lista de enlaces y botones del lector de pantalla aparece un "Editar" igual por cada fila. Demos sí les pone `aria-label` con el título (`src/app/panel/demos/page.tsx:77,81`, `src/app/panel/demos/boton-borrar.tsx:20`), y Subir y Bajar de proyectos también.
- **Propuesta:** el mismo `aria-label` con el nombre en los botones de proyectos y servicios.

#### UX-PANEL-19 — La subida de imágenes dice cosas distintas en proyectos y servicios

- **Dónde:** `src/app/panel/proyectos/formulario.tsx:85-102`, `:116` y `:132-134`; `src/app/panel/servicios/formulario.tsx:177` y `:187`; `src/app/panel/servicios/subida.ts:3`.
- **Qué pasa:** proyectos avisa el límite de "2000 × 2000 px" y servicios no (el servidor lo exige igual); "Subiendo…" de servicios no está en una región `aria-live` (la de proyectos sí); los mensajes de error de red difieren. Proyectos repite a mano lo que hace `subirImagenDelPanel`.
- **Propuesta:** un componente `CampoImagen` compartido sobre `subirImagenDelPanel`, con la ayuda completa y el estado anunciado.

#### UX-PANEL-20 — La validación del navegador aparece antes que la nuestra

- **Dónde:** `pattern` del slug en `src/app/panel/proyectos/formulario.tsx:185`; `type="url"` en `:248` y en `src/app/panel/demos/formulario.tsx:129`.
- **Qué pasa:** un slug con mayúsculas muestra el globo del navegador "Usá el formato solicitado" (o "Please match the requested format"), sin decir cuál; el texto de ayuda está arriba y no se repite.
- **Propuesta:** `title="Minúsculas, números y guiones; sin espacios"` en el slug (el navegador lo suma al globo), o validar en el cliente con los mismos mensajes del servidor.

#### UX-PANEL-21 — "Cancelar" descarta lo escrito sin avisar

- **Dónde:** `src/app/panel/proyectos/formulario.tsx:347`, `src/app/panel/demos/formulario.tsx:166`, `src/app/panel/servicios/formulario.tsx:201`.
- **Qué pasa:** con el caso de estudio a medio escribir, un toque en "Cancelar" (que está al lado de "Guardar") vuelve a la lista y se pierde todo.
- **Propuesta:** si el formulario cambió, pedir confirmación antes de salir (con el componente de UX-PANEL-07) o separar más "Cancelar" de "Guardar".

#### UX-PANEL-22 — La línea de visitantes únicos tiene poco contraste

- **Dónde:** `src/app/panel/metricas/graficos.tsx:133` (`acento` punteado sobre `papel`).
- **Qué pasa:** 2,84:1, por debajo del 3:1 de WCAG 1.4.11 para gráficos. Lo atenúa que los datos están en la tabla (`src/app/panel/metricas/page.tsx:217-221`) y que la línea es punteada.
- **Propuesta:** `terciario` (4,55:1) punteado para los únicos, o un trazo más grueso con contorno.

#### UX-PANEL-23 — El aviso de usuarios se repite al recargar

- **Dónde:** `src/app/panel/usuarios/page.tsx:67` y `:78-85`; `src/app/panel/usuarios/ruta.ts:37`.
- **Qué pasa:** el `?aviso=bloqueado` queda en la URL: recargar, o volver con el botón Atrás, muestra otra vez "Listo: bloqueamos la cuenta".
- **Propuesta:** limpiar el parámetro después de mostrarlo (`router.replace` sin `aviso` desde un componente cliente chico), o aceptarlo y documentarlo si se adopta el mismo patrón en UX-PANEL-04.

#### UX-PANEL-24 — La respuesta por email no muestra cuánto queda

- **Dónde:** `src/app/panel/consultas/[id]/controles.tsx:105-116` (`maxLength={LARGO_MAXIMO_RESPUESTA}`).
- **Qué pasa:** al pegar un texto largo, el navegador lo corta en el límite sin avisar, y la respuesta sale incompleta.
- **Propuesta:** un contador "N de M caracteres" debajo del campo (con `aria-live="polite"` solo cerca del límite).

#### UX-PANEL-25 — En celular, las secciones del admin que no entran no se insinúan

- **Dónde:** `src/components/panel/EnlacesPanel.tsx:53-59` (barra con `overflow-x-auto`).
- **Qué pasa:** siete chips en 360 px: las secciones del final quedan fuera sin una sombra ni un borde cortado que indique que hay más. La sección actual sí se centra (`:39-46`). Verificar en el navegador.
- **Propuesta:** un degradé de `superficie` en el borde derecho mientras haya scroll, o pasar a un menú "Más" cuando no entran.

#### UX-PANEL-26 — Los filtros de métricas son landmarks de navegación

- **Dónde:** `src/app/panel/metricas/page.tsx:32-48` (`<nav aria-label="Rango">`, `<nav aria-label="Tipo">` y `aria-current="page"`).
- **Qué pasa:** el lector de pantalla lista "Rango" y "Tipo" junto a la navegación del panel, y anuncia "página actual" en un filtro.
- **Propuesta:** `<div role="group" aria-label="Rango">` y `aria-current="true"`; los enlaces siguen igual.

#### UX-PANEL-27 — El 403 saca del panel y manda al inicio del sitio

- **Dónde:** `src/app/forbidden.tsx:5-16` (está en la raíz de `app/`, así que reemplaza al shell del panel) y `:11` (`href="/"`).
- **Qué pasa:** un operador que abre `/panel/usuarios` desde un enlace viejo ve el 403 sin el menú del panel, y el único botón lo lleva al inicio del sitio. Solo pasa escribiendo o pegando la URL: el menú no muestra esas secciones. Verificar en el navegador que el shell no se renderiza.
- **Propuesta:** un `forbidden.tsx` en la carpeta del panel, con "Esta sección es solo para admin" y un enlace a Consultas.

## 3. Lo que está bien y conviene mantener

- Los mensajes con `aria-live` están siempre en el DOM y solo cambia el texto (`src/app/panel/consultas/[id]/controles.tsx:19-26` y el resto), así que los lectores los anuncian.
- Los formularios conservan lo escrito si el servidor rechaza el envío (`key` por intento) y no muestran datos viejos al volver (`key` por versión): no se pierde trabajo.
- Movimiento: `apretable` se apaga con `prefers-reduced-motion` (`src/styles/globals.css:95-107`), los gráficos no se animan en ese caso (`src/app/panel/metricas/graficos.tsx:37-43`) y la barra inferior usa `scrollIntoView` sin `smooth`.
- Cada gráfico tiene título, resumen en texto y "Ver los datos en una tabla" con `caption` y `scope` (`src/app/panel/metricas/page.tsx:51-89`).
- Navegación con `aria-current`, la sección actual siempre a la vista en celular y anillo de foco que no se recorta (`src/components/panel/EnlacesPanel.tsx`).
- Estados vacíos que distinguen "no hay nada" de "no hay nada con esos filtros" (bandeja y usuarios) y que ofrecen el paso siguiente (nueva demo sin proyectos: `src/app/panel/demos/nueva/page.tsx:20-27`).
- La confirmación de borrar un proyecto dice cuántas demos se van con él y qué pasa si es el último (`src/app/panel/proyectos/lista.tsx:140-143`).
- Usuarios: el aviso con `role="status"` / `role="alert"` y textos de una lista fija es el patrón a copiar para el feedback de éxito.
- El detalle de una consulta es honesto con el envío dudoso ("puede haber llegado. Revisá Enviados en Gmail…", `src/app/panel/consultas/[id]/detalle.tsx:29-34`).
- Fechas con `<time>` y la zona horaria de Argentina, y textos en rioplatense en todo el panel.

## 4. Issues propuestos

Para pasar a GitHub con `crear-issue` después de revisar. Todos llevan `tipo:` y `area:panel`; la prioridad sale de la gravedad más alta que cubren.

| # | Título | Labels sugeridos | Hallazgos |
|---|---|---|---|
| 1 | Subir el contraste del chip de estado "En curso" | `tipo:bug`, `area:panel`, `area:diseno`, `prioridad:alta` | UX-PANEL-01 |
| 2 | Mostrar el foco en el selector de ícono de los servicios | `tipo:bug`, `area:panel`, `prioridad:alta` | UX-PANEL-02 |
| 3 | Avisar los errores de las acciones de las listas de demos y servicios | `tipo:bug`, `area:panel`, `prioridad:alta` | UX-PANEL-03 |
| 4 | Confirmar lo que se guardó en el panel | `tipo:feature`, `area:panel`, `prioridad:media` | UX-PANEL-04, UX-PANEL-05, UX-PANEL-23 |
| 5 | Unificar cómo se muestran y enfocan los errores de los formularios del panel | `tipo:feature`, `area:panel`, `area:diseno`, `prioridad:media` | UX-PANEL-06, UX-PANEL-20 |
| 6 | Unificar las confirmaciones del panel en un componente accesible | `tipo:feature`, `area:panel`, `area:diseno`, `prioridad:media` | UX-PANEL-07, UX-PANEL-08, UX-PANEL-09, UX-PANEL-21 |
| 7 | Unificar las listas de proyectos, demos y servicios | `tipo:task`, `area:panel`, `area:diseno`, `prioridad:media` | UX-PANEL-10, UX-PANEL-18, UX-PANEL-19 |
| 8 | Agregar pantallas de carga, error, 404 y 403 propias del panel | `tipo:feature`, `area:panel`, `prioridad:media` | UX-PANEL-11, UX-PANEL-27 |
| 9 | Completar los títulos de pestaña del panel | `tipo:task`, `area:panel`, `prioridad:media` | UX-PANEL-12 |
| 10 | Mostrar la cuenta y el botón Salir en el panel, con salto al contenido | `tipo:feature`, `area:panel`, `prioridad:media` | UX-PANEL-13, UX-PANEL-14, UX-PANEL-25 |
| 11 | Agregar estados vacíos y mejorar el contraste en métricas | `tipo:task`, `area:panel`, `prioridad:media` | UX-PANEL-15, UX-PANEL-22, UX-PANEL-26 |
| 12 | Acortar el camino para responder una consulta | `tipo:feature`, `area:panel`, `prioridad:media` | UX-PANEL-16, UX-PANEL-24 |
| 13 | Sacar la jerga interna de los textos del panel | `tipo:task`, `area:panel`, `prioridad:baja` | UX-PANEL-17 |

El issue 10 toca la sesión (un botón "Salir" en el panel): según `AGENTS.md`, cualquier cambio de auth se consulta antes, aunque reuse la acción que ya existe. El issue 8 se coordina con la auditoría transversal, que cubre la 404 y el error del sitio público.
