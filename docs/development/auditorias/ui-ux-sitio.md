# Auditoría de UI y UX del sitio público

Fecha: 2026-10-18 · Issue: #80 · IDs: `UX-SITIO-NN` · Código auditado: `main` en `8181d60`.

Lista priorizada de mejoras para el sitio público antes de las exposiciones (26/10). No cambia código: cada hallazgo propone un issue (tabla al final), que se abre con `crear-issue` después de revisar este documento.

## 1. Alcance y método

**Páginas y componentes revisados**

| Página | Archivos |
|---|---|
| `/` (landing) | `src/app/(sitio)/page.tsx`, `src/components/sitio/` (`Navbar`, `Sections`, `StackBand`, `Contact`, `ContactForm`, `CuentaBarra`, `MenuCuenta`, `Highlight`, `Illustrations`, `HeroMotion`, `Reveal`, `ShareButton`, `CopyProfileLink`) |
| `/proyectos` | `src/app/(sitio)/proyectos/page.tsx` |
| `/proyectos/[slug]` (caso de estudio y demo) | `src/app/(sitio)/proyectos/[slug]/page.tsx` |
| `/cuenta` | `src/app/(sitio)/cuenta/page.tsx` |
| `/ingresar` | `src/app/(auth)/ingresar/page.tsx`, `src/lib/ingreso.ts` (textos de los avisos) |
| Errores | `src/app/forbidden.tsx` (403). No hay `not-found.tsx`, `error.tsx` ni `global-error.tsx` en `src/app/` |
| Base visual | `src/styles/globals.css` (tokens), `src/app/layout.tsx` |

**Qué se miró en producción** (https://paper-folio.vercel.app, Playwright con Chromium headless, 1440×900 y 360×800, con y sin `prefers-reduced-motion: reduce`):

- `/`, `/proyectos`, `/ingresar` (también con `?error=bloqueado`), una URL inexistente (404) y `/cuenta` y `/proyectos/<slug>` sin sesión (redirigen a `/ingresar`).
- Capturas por sección, menú de celular abierto, recorrido con Tab de la barra, envío vacío del formulario y un envío con `POST /api/consultas` interceptado en el navegador (respuesta falsa: no se mandó ninguna consulta real), desborde horizontal y tamaño de los objetivos táctiles.

**Qué se auditó solo en código:** lo que pide sesión (`/cuenta`, el caso de estudio y la demo embebida, el menú de la cuenta), el 403 y los avisos de error de `/ingresar` que no se pueden provocar desde afuera.

**Contraste:** calculado con la fórmula de WCAG sobre los hex de `src/styles/globals.css:9-15`.

| Texto o elemento sobre fondo | Contraste | Dónde se usa | Resultado |
|---|---|---|---|
| tinta sobre papel | 19,68:1 | cuerpo del sitio | pasa |
| tinta sobre primario | 11,35:1 | resaltados, tarjeta "¿Necesitás otra cosa?" | pasa |
| tinta sobre acento | 6,94:1 | resaltados | pasa |
| papel sobre secundario | 3,78:1 | resaltado del hero (`tones.ts:16`) | pasa solo como texto grande (≥ 24 px o ≥ 18,66 px en negrita); hoy se usa solo en títulos |
| papel sobre terciario | 4,55:1 | resaltado de "trayectoria" | pasa |
| tinta sobre terciario | 4,33:1 | inicial de la tarjeta de proyecto (24 px negrita) | pasa como texto grande |
| tinta/70 sobre papel | 7,57:1 | nombre en el menú de la cuenta (`MenuCuenta.tsx:103`) | pasa |
| foco (secundario) sobre papel / sobre tinta | 3,78:1 / 5,20:1 | `globals.css:73-76` | pasa (1.4.11, mínimo 3:1) |
| acento sobre papel | 2,84:1 | punto de los errores del formulario | decorativo: el texto del error lleva el mensaje |

**Gravedad:** **alta**, impide una tarea o rompe la accesibilidad; **media**, confunde o es inconsistente con el manual; **baja**, pulido.

## 2. Hallazgos

### Alta

#### UX-SITIO-01 — La página 404 es la de Next, en inglés y sin salida

- **Página:** cualquier URL inexistente, y `/proyectos/[slug]` con un slug despublicado o inexistente para quien tiene sesión.
- **Dónde:** falta un `not-found.tsx` en `src/app/`; el 404 lo dispara `src/app/(sitio)/proyectos/[slug]/page.tsx:54` (`notFound()`).
- **Qué pasa:** en producción, `/no-existe-xyz` muestra "404 · This page could not be found." con el título de pestaña "404: This page could not be found.", sin la barra, sin el pie y sin ningún enlace. El documento declara `lang="es-AR"` (`src/app/layout.tsx:20`) con el texto en inglés.
- **Por qué importa:** quien llega por un link viejo (por ejemplo, un proyecto despublicado que alguien compartió) queda en un callejón sin salida. El idioma declarado no coincide con el contenido (WCAG 3.1.1): un lector de pantalla lee el inglés con pronunciación española. Es la página que más fácil aparece en una demo en vivo.
- **Propuesta:** un `not-found.tsx` en `src/app/` con la estética del manual (mismo patrón que `src/app/forbidden.tsx`: `h1`, una línea de ayuda y "Volver al inicio" con `marca apretable`), en español, con un enlace a `/proyectos` y `metadata.title` "Página no encontrada".

### Media

#### UX-SITIO-02 — Un error inesperado muestra la pantalla genérica de Next, en inglés

- **Página:** las que se renderizan en cada pedido: `/proyectos/[slug]` y la barra de sesión (`CuentaBarra`) en todas.
- **Dónde:** faltan `error.tsx` y `global-error.tsx` en `src/app/`. `src/app/(sitio)/cuenta/page.tsx:22-31` y la rama `verificacion` de `src/app/(auth)/ingresar/page.tsx:28-41` manejan la base caída, pero `src/app/(sitio)/proyectos/[slug]/page.tsx:47-139` y `src/components/sitio/CuentaBarra.tsx:5-10` no tienen un límite de error. La landing y `/proyectos` leen el contenido con `"use cache"` (`src/lib/contenido.ts:144,154,178`, `cacheComponents` en `next.config.ts:4`): ahí un error rompe el build o deja servida la versión anterior, no llega a la persona.
- **Qué pasa:** si un componente de servidor dinámico lanza (por ejemplo, un error de código en el detalle o en `sesionParaLaBarra`), Next muestra su pantalla genérica en inglés, sin barra ni forma de reintentar. Solo se revisó en código: no se puede provocar en producción.
- **Por qué importa:** misma ruptura de idioma y de salida que UX-SITIO-01, en el peor momento.
- **Propuesta:** un `error.tsx` en `src/app/` (componente de cliente con `reset()` y el texto "Algo salió mal. Probá de nuevo." más "Volver al inicio") y un `global-error.tsx` mínimo con su propio `<html lang="es-AR">`.

#### UX-SITIO-03 — Las tarjetas de proyecto no avisan que el caso de estudio y la demo piden ingresar

- **Página:** `/` (sección "Mirá mis proyectos destacados").
- **Dónde:** `src/components/sitio/Sections.tsx:146-158` ("Ver caso de estudio" y "Ver demo →").
- **Qué pasa:** en la landing no hay ninguna pista de que esos dos enlaces llevan a `/ingresar`. El aviso existe solo en `/proyectos` (`src/app/(sitio)/proyectos/page.tsx:34-36`). Sin sesión, el clic termina en una pantalla de ingreso sin barra (ver UX-SITIO-05) y la persona no sabe por qué.
- **Por qué importa:** es el recorrido principal del sitio (ver un proyecto) y la sorpresa se siente como un error. Un evaluador lo va a probar sin sesión.
- **Propuesta:** una línea corta encima de la lista de la landing con el mismo texto que `/proyectos`, o una marca en los dos enlaces ("Ver caso de estudio · requiere ingresar" o un candado con texto `sr-only`). Que la marca desaparezca con sesión es opcional: el listado es estático y lo puede saber solo `CuentaBarra`.

#### UX-SITIO-04 — La barra no refleja las secciones de la landing

- **Página:** `/` y todas las que usan la barra.
- **Dónde:** `src/components/sitio/Navbar.tsx:8-14` frente al orden de `src/app/(sitio)/page.tsx:13-19`.
- **Qué pasa:** la barra tiene Inicio, Sobre mí, Proyectos, Stack y Contacto. Faltan "Servicios" (`#servicios`) y "Trayectoria" (`#trayectoria`), y "Stack" va cuarto cuando en la página es la segunda banda. Además, "Stack" lleva a `#stack` (`src/components/sitio/StackBand.tsx:18`), una banda sin título visible: al llegar no hay nada que confirme dónde se está. Tampoco hay `aria-current` ni estado activo de la sección.
- **Por qué importa:** la navegación es el mapa del sitio; si no coincide con lo que se ve al scrollear, desorienta, y dos secciones quedan sin acceso directo.
- **Propuesta:** enlaces en el orden de la página: Inicio, Servicios, Sobre mí, Proyectos, Trayectoria, Contacto. Sacar "Stack" (o dejarlo y darle un título visible a la banda). Si se quieren siete enlaces, verificar que entren en la barra de `max-w-3xl` (`Navbar.tsx:68`) a 1024 px.

#### UX-SITIO-05 — Cada página arma su marco distinto: `/ingresar`, `/cuenta` y el 403 quedan sin barra o sin pie

- **Página:** `/ingresar`, `/cuenta`, 403.
- **Dónde:** `src/app/(auth)/ingresar/page.tsx:102-118` (sin `Navbar` ni `Footer`, tarjeta alineada a la izquierda), `src/app/(sitio)/cuenta/page.tsx:62-75` (con `Navbar`, sin `Footer`), `src/app/forbidden.tsx:5-16` (sin los dos).
- **Qué pasa:** en 1440 px, `/ingresar` es una tarjeta de 448 px pegada al margen izquierdo con el resto de la pantalla en blanco: no hay marca, ni nombre del sitio, ni barra. `/cuenta` tiene barra pero termina sin pie, a diferencia de `/proyectos` y del detalle. Los tres repiten el marco a mano en cada página en vez de usar un layout.
- **Por qué importa:** `/ingresar` es la puerta del contenido para registrados y hoy parece una página suelta, de otro sitio. La inconsistencia del marco se nota al pasar de una página a otra.
- **Propuesta:** centrar la tarjeta de `/ingresar` (`mx-auto`) y sumarle la marca (la "L" y `Lauti.dev` de `Navbar.tsx:70-75`) enlazada al inicio; agregar `Footer` a `/cuenta`. Opcional: mover barra y pie a `src/app/(sitio)/layout.tsx` para que no se repitan en cada página (hoy están en `page.tsx`, `proyectos/page.tsx`, `proyectos/[slug]/page.tsx` y `cuenta/page.tsx`).

#### UX-SITIO-06 — El formulario de contacto no dice que todos los campos son obligatorios

- **Página:** `/#contacto`.
- **Dónde:** `src/components/sitio/ContactForm.tsx:70` (`noValidate`) y `:76-97` (ningún campo tiene `required` ni `aria-required`); las reglas están en `src/lib/contact.ts:12-21`.
- **Qué pasa:** los cuatro campos son obligatorios y el mensaje pide entre 10 y 2000 caracteres, pero nada lo dice antes de enviar. Se descubre con el error ("Contame un poco más (mínimo 10 caracteres)").
- **Por qué importa:** WCAG 3.3.2 (etiquetas o instrucciones): las restricciones tienen que conocerse antes de fallar. Un lector de pantalla no anuncia los campos como obligatorios.
- **Propuesta:** `aria-required="true"` en los cuatro campos (sin `required`, para no reemplazar los mensajes propios por los del navegador), una línea "Todos los campos son obligatorios." arriba del formulario y, en el mensaje, una ayuda "Mínimo 10 caracteres" asociada con `aria-describedby` (que conviva con el id del error).

#### UX-SITIO-07 — Al enviar la consulta, el foco se pierde

- **Página:** `/#contacto`.
- **Dónde:** `src/components/sitio/ContactForm.tsx:99-105` (`disabled={status === "sending"}`) y `:40-43` (`formElement.reset()`).
- **Qué pasa:** al enviar con el teclado, el botón se deshabilita y el foco cae al `body`, y queda ahí después del éxito. Comprobado en producción con la respuesta interceptada: `document.activeElement` es `BODY` durante el envío y después del "¡Gracias!".
- **Por qué importa:** quien navega con teclado o lector de pantalla tiene que volver a recorrer la página desde arriba (WCAG 2.4.3, orden del foco). El aviso de éxito se anuncia (`role="status"`), pero la posición se pierde.
- **Propuesta:** en vez de `disabled`, `aria-disabled="true"` mientras envía (la ref `sending` ya frena el doble envío, `ContactForm.tsx:20,24`), o devolver el foco al botón o al mensaje de éxito al terminar.

#### UX-SITIO-08 — Con movimiento reducido, la banda del stack esconde la mayoría de las tecnologías en celular

- **Página:** `/` (banda inclinada debajo del hero).
- **Dónde:** `src/styles/globals.css:95-101` (`.banda-pista { animation: none; }`) y `src/components/sitio/StackBand.tsx:19-42`.
- **Qué pasa:** con `prefers-reduced-motion: reduce`, la banda queda quieta y cortada por `overflow-hidden`. En 360 px se ven 2 de las 8 tecnologías (TypeScript y Next.js); en 1440 px, las 8. El botón "Pausar animación" sigue visible aunque no haya nada que pausar.
- **Por qué importa:** quien pidió menos movimiento se queda sin la información de la banda, y un botón que no hace nada confunde.
- **Propuesta:** con movimiento reducido, que la pista haga `flex-wrap` (o muestre la lista sin la copia duplicada) y ocultar el botón (`motion-reduce:hidden`).

#### UX-SITIO-09 — Los títulos de pestaña no dicen de qué sitio ni de qué proyecto son

- **Página:** `/proyectos`, `/proyectos/[slug]`, `/cuenta`, `/ingresar`.
- **Dónde:** `src/app/layout.tsx:12-15` (`title: siteConfig.name`, sin `template`); `src/app/(sitio)/proyectos/[slug]/page.tsx:23` (`title: "Caso de estudio"` fijo).
- **Qué pasa:** en producción las pestañas dicen "Proyectos" o "Ingresar", sin el nombre del sitio, y todos los casos de estudio se llaman "Caso de estudio".
- **Por qué importa:** WCAG 2.4.2 (título descriptivo): con varias pestañas abiertas, o en el historial, no se distinguen. También es lo que se ve al compartir un link de `/proyectos`.
- **Propuesta:** `` title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` } `` en el layout raíz (o una constante corta en `src/lib/site.ts`, para no copiar el nombre a mano) y `generateMetadata` en el detalle con el nombre del proyecto. Ojo: `generateMetadata` no espera a `requerirSesion` (`[slug]/page.tsx:50`; con `cacheComponents` la metadata se resuelve aparte de la página), así que tiene que comprobar la sesión por su cuenta antes de leer el proyecto, o devolver el título genérico, para no revelar si el slug existe. Leer la sesión en la metadata la vuelve dinámica: revisar que el build no falle con `cacheComponents`. Toca sesiones: se consulta antes de implementar (`AGENTS.md`, Autonomía).

#### UX-SITIO-10 — Los avisos de cuenta bloqueada mandan al formulario de contacto sin enlace, y cambian de voz

- **Página:** `/ingresar` con la cuenta bloqueada o el email sin verificar.
- **Dónde:** `src/app/(auth)/ingresar/page.tsx:46-49`; `src/lib/ingreso.ts:52` y `:57`.
- **Qué pasa:** el texto dice "escribinos por el formulario de contacto", pero no enlaza a `/#contacto`, y `/ingresar` no tiene barra (UX-SITIO-05): hay que volver al inicio y buscarlo. Además, la voz está mezclada: los textos de presentación van en primera persona del singular ("Contactame", "Te respondo por email", `ContactForm.tsx:107`) y los de error, en plural ("escribinos", "No pudimos…" en `ContactForm.tsx:51,55`, `src/app/(sitio)/cuenta/page.tsx:29`, `src/app/(auth)/ingresar/page.tsx:32`, `src/lib/ingreso.ts:57,60,70` y los mensajes de `src/app/api/consultas/route.ts:14,38`, que el formulario muestra tal cual).
- **Por qué importa:** a quien está bloqueado se le indica una salida que no puede tomar desde ahí. La voz que cambia hace que la página parezca de otro producto.
- **Propuesta:** que "formulario de contacto" sea un enlace a `/#contacto` en los tres avisos y unificar la voz en todos los textos de arriba, no solo en `/ingresar` (decidir con el equipo si el sitio habla en singular o en plural). Los textos de `src/lib/ingreso.ts` son del flujo de ingreso: cambiarlos es tocar auth, se consulta antes (`AGENTS.md`, Autonomía).

### Baja

#### UX-SITIO-11 — Un campo con error no cambia de aspecto

- **Página:** `/#contacto`.
- **Dónde:** `src/components/sitio/ContactForm.tsx:9` (`FIELD`, sin variantes para `aria-invalid`).
- **Qué pasa:** el campo inválido tiene el mismo borde que uno válido; el error se ve solo en el texto de abajo (con su punto de color).
- **Por qué importa:** en un formulario largo en celular, el campo con problema no se ubica de un vistazo.
- **Propuesta:** un token nuevo de grosor (por ejemplo `--borde-error` en `@theme`) aplicado con `aria-invalid:`, o un fondo suave de la paleta, siempre con tokens (el borde ya es tinta; el cambio tiene que ser de grosor o de fondo, no solo de color).

#### UX-SITIO-12 — El mensaje de error empuja el formulario al aparecer

- **Página:** `/#contacto`.
- **Dónde:** `src/components/sitio/ContactForm.tsx:136` (`min-h-5` junto con `sr-only` cuando no hay error).
- **Qué pasa:** `sr-only` saca el párrafo del flujo, así que el `min-h-5` no reserva lugar: cuando aparecen los errores, cada campo baja unos 20 px (visible en la captura de 360 px).
- **Por qué importa:** salto de diseño justo cuando la persona intenta corregir.
- **Propuesta:** sacar `sr-only` y dejar el párrafo vacío con `min-h-5` (el contenido vacío no se anuncia), o aceptar el salto y quitar el `min-h-5`, que hoy no hace nada.

#### UX-SITIO-13 — No hay enlace para saltar al contenido

- **Página:** todas las que tienen barra.
- **Dónde:** `src/components/sitio/Navbar.tsx:65`.
- **Qué pasa:** con Tab, antes del primer botón del hero hay 8 paradas en la barra (logo, cinco enlaces, "Contactame" e "Ingresar"). El `<main>` existe, así que WCAG 2.4.1 se cumple por landmarks, pero quien usa teclado sin lector no tiene atajo.
- **Por qué importa:** pulido de accesibilidad de teclado, barato.
- **Propuesta:** un "Saltar al contenido" `sr-only focus:not-sr-only` como primer hijo del `header`, apuntando a un `id="contenido"` en cada `<main>`.

#### UX-SITIO-14 — Enlaces repetidos sin contexto y enlaces externos sin aviso

- **Página:** `/`, `/proyectos`, pie.
- **Dónde:** `src/components/sitio/Sections.tsx:155-161` ("Ver demo →" y "Ver en GitHub →", iguales en las cuatro tarjetas), `:114`; `src/components/sitio/Contact.tsx:45-52`; `src/app/(sitio)/proyectos/[slug]/page.tsx:83-89`.
- **Qué pasa:** en la lista de enlaces de un lector de pantalla aparecen cuatro "Ver demo" y cuatro "Ver en GitHub" iguales, aunque "Compartir" sí suma el nombre del proyecto en `sr-only` (`ShareButton.tsx:32`). Los enlaces con `target="_blank"` no avisan que abren otra pestaña (salvo los que lo dicen en el texto).
- **Por qué importa:** WCAG 2.4.4 se cumple por el contexto de la tarjeta, pero la lista de enlaces queda ambigua; abrir pestañas sin aviso desorienta a quien no ve.
- **Propuesta:** sumar `<span className="sr-only"> de {project.nombre}</span>` como en `ShareButton`, y "(se abre en otra pestaña)" en `sr-only` en los enlaces externos.

#### UX-SITIO-15 — `/proyectos` salta de `h1` a `h3`

- **Página:** `/proyectos`.
- **Dónde:** `src/app/(sitio)/proyectos/page.tsx:31` (`h1`) y `src/components/sitio/Sections.tsx:141` (`h3` de `ProjectCard`).
- **Qué pasa:** en la landing la tarjeta cuelga de un `h2` de sección, pero en `/proyectos` cuelga directo del `h1`.
- **Por qué importa:** la jerarquía de títulos es como navegan los lectores de pantalla; un nivel salteado sugiere que falta una sección.
- **Propuesta:** un prop `nivel` en `ProjectCard` (`h2` en `/proyectos`, `h3` en la landing), sin cambiar el estilo.

#### UX-SITIO-16 — Tamaños de letra fuera de la escala de tokens

- **Página:** `/`, `/proyectos`, detalle, pie.
- **Dónde:** `src/components/sitio/Sections.tsx:23` (`text-[2.25rem]` y `lg:text-[3.75rem]`), `src/components/sitio/Highlight.tsx:22` y `src/app/(sitio)/proyectos/page.tsx:31` (`text-[1.75rem] leading-[1.15]`, repetido), `text-xs` en `Sections.tsx:138,143`, `Contact.tsx:57`, `ShareButton.tsx:34` y `proyectos/[slug]/page.tsx:74`.
- **Qué pasa:** la escala de `globals.css:17-26` tiene h1 (48 px), h2 (36), h3 (24), cuerpo (16) y pequeño (14). El hero usa 36 y 60 px, los títulos de sección en celular 28 px y varias etiquetas 12 px, todo como valores sueltos. `/proyectos` copia a mano las clases de `SectionTitle` en vez de reusarlo.
- **Por qué importa:** la convención es tipografía solo desde tokens (`AGENTS.md`); los valores sueltos se desalinean cuando el manual definitivo cambie la escala (`globals.css:3-6` dice que los tokens son provisorios).
- **Propuesta:** sumar a `@theme` los tamaños que el manual usa de verdad (por ejemplo `--text-display`, `--text-h2-movil`, `--text-etiqueta`) y reemplazar los valores sueltos; en `/proyectos`, un `SectionTitle as="h1"`.

#### UX-SITIO-17 — Los botones de la barra no siguen el mismo estilo

- **Página:** todas las que tienen barra (1024 px o más).
- **Dónde:** `src/components/sitio/Navbar.tsx:86-91` ("Contactame": `rounded-lg`, sin borde ni sombra) frente a `src/components/sitio/MenuCuenta.tsx:23-28` ("Ingresar": `marca apretable`).
- **Qué pasa:** dos botones vecinos con estilos distintos: uno plano y otro con el contorno y la sombra dura del manual.
- **Por qué importa:** inconsistencia con la pieza de marca, visible arriba de todo en cada página.
- **Propuesta:** "Contactame" con `marca apretable` y `min-h-11`, igual que "Ingresar" (o los dos planos, pero iguales).

#### UX-SITIO-18 — "Copiar link del perfil" compite con el formulario

- **Página:** `/#contacto`.
- **Dónde:** `src/components/sitio/Contact.tsx:18` y `src/components/sitio/CopyProfileLink.tsx:21-28`.
- **Qué pasa:** al lado del formulario, la única otra acción es copiar el link del sitio, con el mismo peso visual que un botón principal. No hay un canal alternativo (email, LinkedIn) para quien no quiere usar el formulario.
- **Por qué importa:** en la sección de contacto, la acción secundaria se lee como la principal y no ayuda a contactar.
- **Propuesta:** bajarla a un enlace de texto (o llevarla al pie) y, si se quiere, sumar los perfiles que ya están en el pie (GitHub y X, `Contact.tsx:43-54`). Un email visible sería un dato nuevo en `src/content/profile.ts`.

#### UX-SITIO-19 — `/ingresar` no dice para qué se ingresa ni vuelve a donde estaba

- **Página:** `/ingresar`.
- **Dónde:** `src/app/(auth)/ingresar/page.tsx:108` (texto fijo) y `:112-114` ("Volver al inicio" siempre a `/`).
- **Qué pasa:** viniendo de `/cuenta` el texto igual dice "para ver el detalle de los proyectos y las demos". Si la persona se arrepiente, "Volver al inicio" la saca de `/proyectos` aunque viniera de ahí; el `callbackUrl` ya está en la URL.
- **Por qué importa:** pulido de orientación en la puerta de entrada del contenido protegido.
- **Propuesta:** un texto neutro ("Ingresá con tu cuenta de Google para ver los casos de estudio y las demos, y tu cuenta.") y que el enlace de volver lleve a donde estaba la persona. El `callbackUrl` no alcanza para saberlo (un detalle se abre tanto desde la landing como desde `/proyectos`): habría que sumar el origen al armar el enlace (`urlDeIngreso`, `src/lib/acceso.ts:52`), validado con `rutaInterna`, o usar `history.back()` cuando la página anterior es del mismo sitio. Toca el flujo de ingreso: se consulta antes.

#### UX-SITIO-20 — Microcopy: "Mi amplio set de habilidades"

- **Página:** `/` (sección de servicios).
- **Dónde:** `src/components/sitio/Sections.tsx:51-53`.
- **Qué pasa:** "set" es un anglicismo y "amplio" es un autoelogio que el resto del sitio no usa (el resto es concreto: "Construyo aplicaciones web de punta a punta").
- **Por qué importa:** el tono del sitio es directo y en rioplatense; este título desentona.
- **Propuesta:** "Lo que puedo hacer por vos" o "Servicios de punta a punta" (con el resaltado en las últimas palabras). Lo decide quien escribe el contenido.

## 3. Lo que está bien y conviene mantener

- **Movimiento:** GSAP solo anima con `(prefers-reduced-motion: no-preference)` (`src/lib/gsap.ts:9`), el hero no toca la opacidad para no parpadear al hidratar (`HeroMotion.tsx:7-9`), y el CSS apaga el scroll suave, la banda y el "apretar" (`globals.css:95-108`). La banda se puede pausar (WCAG 2.2.2, `StackBand.tsx:33-41`).
- **Foco:** contorno global de 2 px en secundario (`globals.css:73-76`) con contraste suficiente sobre papel y sobre tinta; `scroll-pt-24` (`layout.tsx:22`) evita que la barra fija tape lo enfocado o el destino de un ancla (WCAG 2.4.11).
- **Menús:** el de celular deja inerte el resto de la página, se cierra con Escape y devuelve el foco (`Navbar.tsx:36-62`); el de la cuenta cierra con Escape, al salir con Tab y al hacer clic afuera, con el caso de Safari resuelto (`MenuCuenta.tsx:47-76`).
- **Formulario:** labels reales, `aria-invalid` y `aria-describedby`, foco al primer error, regiones `role="status"` y `role="alert"` presentes desde el principio (así se anuncian), la misma validación de Zod que el servidor (`src/lib/contact.ts`), errores que no dependen solo del color y una trampa para bots que no llega al teclado (`ContactForm.tsx:71-74`).
- **Responsive:** sin desborde horizontal en 360 px en ninguna página revisada; botones del hero a ancho completo en celular; el lugar de la sesión reserva su espacio mientras carga (`MenuCuenta.tsx:15-17`).
- **Demo embebida:** `iframe` con `title`, `sandbox` y `referrerPolicy`, y alternativas claras cuando no se puede embeber o es `http` (`proyectos/[slug]/page.tsx:145-219`).
- **Microcopy de errores:** los avisos de `/ingresar` (`src/lib/ingreso.ts:49-71`) explican qué pasó y qué hacer, sin culpar a la persona ni mostrar texto de la URL.
- **Tokens:** ningún hex fuera de `globals.css`; las ilustraciones usan `var(--color-…)` (`Illustrations.tsx:1-6`).

## 4. Issues propuestos

Títulos con el formato de auditoría de `docs/convencion-nombres-github.md` §4.4 (`Auditoría <área>: <hallazgo>`), con el hallazgo en imperativo. Todos llevan `tipo:audit` y el link a este documento en el cuerpo. La prioridad es una sugerencia para triar antes del 26/10.

| # | Título | Labels sugeridos | Cubre |
|---|---|---|---|
| 1 | Auditoría UI sitio: agregar páginas de error 404 y 500 en español | `tipo:audit`, `area:web`, `area:diseno`, `prioridad:alta` | UX-SITIO-01, UX-SITIO-02 |
| 2 | Auditoría UI sitio: avisar en la landing que el caso de estudio y la demo piden ingresar | `tipo:audit`, `area:web`, `prioridad:alta` | UX-SITIO-03 |
| 3 | Auditoría UI sitio: alinear la barra con las secciones de la landing | `tipo:audit`, `area:web`, `area:diseno`, `prioridad:media` | UX-SITIO-04, UX-SITIO-17 |
| 4 | Auditoría UI sitio: unificar el marco de ingresar, cuenta y 403 | `tipo:audit`, `area:web`, `area:diseno`, `prioridad:media` | UX-SITIO-05, UX-SITIO-19 |
| 5 | Auditoría UI sitio: mejorar la accesibilidad del formulario de contacto | `tipo:audit`, `area:web`, `prioridad:media` | UX-SITIO-06, UX-SITIO-07, UX-SITIO-11, UX-SITIO-12 |
| 6 | Auditoría UI sitio: mostrar todo el stack con movimiento reducido | `tipo:audit`, `area:web`, `area:diseno`, `prioridad:media` | UX-SITIO-08 |
| 7 | Auditoría UI sitio: dar títulos de pestaña con el sitio y el proyecto | `tipo:audit`, `area:web`, `area:auth`, `prioridad:media` | UX-SITIO-09 |
| 8 | Auditoría UI sitio: enlazar el contacto en los avisos de ingreso y unificar la voz | `tipo:audit`, `area:web`, `area:auth`, `prioridad:media` | UX-SITIO-10, UX-SITIO-20 |
| 9 | Auditoría UI sitio: sumar salto al contenido y contexto a los enlaces | `tipo:audit`, `area:web`, `prioridad:baja` | UX-SITIO-13, UX-SITIO-14, UX-SITIO-15 |
| 10 | Auditoría UI sitio: pasar los tamaños de letra sueltos a tokens | `tipo:audit`, `area:diseno`, `prioridad:baja` | UX-SITIO-16 |
| 11 | Auditoría UI sitio: bajar el peso de copiar el link en contacto | `tipo:audit`, `area:web`, `area:diseno`, `prioridad:baja` | UX-SITIO-18 |

Notas para quien los abra:

- Los issues 4 (por UX-SITIO-19), 7 y 8 tocan sesiones o el flujo de ingreso: según `AGENTS.md` (Autonomía), quien los implemente consulta a una persona antes de empezar, aunque el issue lo pida.
- El issue 7 toca `generateMetadata` en una ruta con sesión: revisar que no revele si un slug existe (ver UX-SITIO-09).
- El issue 8 pide una decisión de voz (singular o plural) antes de tocar los textos, y los de `src/lib/ingreso.ts` tienen tests.
- El issue 10 depende del manual de marca definitivo si llega antes que el arreglo (`globals.css:3-6`).
