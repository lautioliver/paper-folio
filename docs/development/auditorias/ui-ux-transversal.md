# Auditoría UI/UX transversal: accesibilidad, responsive y sistema visual

Issue: #82. Fecha: 2026-10-18. Base: `main` en `8181d60`.

Este documento cubre lo que se repite en todo el sitio y el panel, o lo que es del sistema (tokens, foco, movimiento, componentes compartidos). Los hallazgos de una sola página los cubren las otras dos auditorías: sitio público (#80, `ui-ux-sitio.md`) y panel (#81, `ui-ux-panel.md`), en esta misma carpeta. Cuando un tema aparece en más de una, este documento es el dueño de lo que es de sistema y cada hallazgo dice qué IDs de las otras reemplaza, así se abre un solo issue; lo que es de una sola sección queda en la otra auditoría y acá solo se remite. Los IDs son `UX-TRANS-NN` y no cambian: cada issue que salga de acá los cita.

## 1. Alcance y método

**Páginas:** `/`, `/proyectos`, `/proyectos/[slug]`, `/cuenta`, `/ingresar`, la página 403 (`src/app/forbidden.tsx`) y todo `/panel` (consultas, proyectos, demos, servicios, usuarios, métricas).

**Componentes:** `src/components/sitio/*` (Navbar, MenuCuenta, Highlight, tones, Sections, StackBand, Reveal, HeroMotion, ContactForm, ShareButton, CopyProfileLink, Contact/Footer, Illustrations), `src/components/panel/*` (PanelShell, EnlacesPanel, ChipEstado), `src/components/Container.tsx`, los formularios y listas de `src/app/panel/**`, los tokens y utilidades de `src/styles/globals.css` y la metadata de `src/app/layout.tsx`.

**Qué se miró en producción** (https://paper-folio.vercel.app, Playwright con Chromium, 2026-10-18): `/`, `/proyectos` e `/ingresar` a 360, 768 y 1440 px de ancho. En cada una se midió el scroll horizontal (`scrollWidth - innerWidth`), el tamaño de cada control visible, los encabezados, los landmarks, las primeras ocho paradas de Tab con el estilo del foco, el `<title>` y los `<meta>`. Además, a 360 px y con `prefers-reduced-motion: reduce`: la animación de la banda del stack, el `scroll-behavior` y el recorrido de Tab con el menú móvil abierto. Las capturas de página completa no muestran lo que envuelve `Reveal` (arranca en opacidad 0 hasta que se hace scroll): no es un hallazgo, es una limitación de la captura.

**Qué se miró solo en código:** todo lo que pide sesión (`/proyectos/[slug]`, `/cuenta`, `/panel/**`) y los estados que no se pueden provocar desde afuera (errores de formulario, avisos, menú de la cuenta).

**Contraste:** se calculó con la fórmula de luminancia relativa de WCAG 2.2, con los hex de `src/styles/globals.css:9-15`, para cada par fondo/texto que aparece en `src/` (búsqueda de `bg-*` y `text-*` de la paleta). Texto grande = desde 24 px, o desde 18,66 px en negrita (AA pide 3:1); texto normal pide 4,5:1; los indicadores no textuales (foco, estado seleccionado) piden 3:1 contra lo que tienen al lado (1.4.11).

**Gravedad:** **alta** impide una tarea o rompe la accesibilidad (falla un criterio de nivel A o AA); **media** confunde o es inconsistente con el manual; **baja** es pulido.

## 2. Contraste de los tokens que se usan

| Texto sobre fondo | Ratio | AA normal (4,5) | AA grande (3) | Dónde se usa |
|---|---|---|---|---|
| `tinta` sobre `papel` | 19,68 | pasa | pasa | Texto base (`globals.css:69-72`), formularios, tarjetas |
| `papel` sobre `tinta` | 19,68 | pasa | pasa | Botones primarios, pie (`Contact.tsx:30`), trayectoria (`Sections.tsx:205`), categoría del proyecto (`Sections.tsx:138`) |
| `tinta` sobre `superficie` | 16,81 | pasa | pasa | Barra del panel (`PanelShell.tsx:14,25`), estados vacíos, chip "Respondida" (`ChipEstado.tsx:6`) |
| `tinta` sobre `primario` | 11,35 | pasa | pasa | Resaltado `primario`, tarjeta "¿Necesitás otra cosa?" (`Sections.tsx:72`), chips activos, chip "Nueva" (`ChipEstado.tsx:4`), aviso de éxito (`usuarios/page.tsx:81`) |
| `tinta/70` sobre `papel` | 7,57 | pasa | pasa | Nombre en el menú de la cuenta (`MenuCuenta.tsx:103`) |
| `tinta` sobre `acento` | 6,94 | pasa | pasa | Resaltado `acento`, aviso de error y chip "Bloqueado" (`usuarios/page.tsx:81,115`) |
| `tinta` sobre `secundario` | 5,20 | pasa | pasa | Inicial del proyecto con tono `secundario` (`Sections.tsx:131`) |
| `papel` sobre `terciario` | 4,55 | pasa (justo) | pasa | Resaltado `terciario` en "trayectoria" (`Sections.tsx:209`, `tones.ts:17`) |
| `tinta` sobre `terciario` | 4,33 | **no pasa** | pasa | Inicial del proyecto con tono `terciario` (`Sections.tsx:131`, `[slug]/page.tsx:67`): `text-h3` es 24 px, así que hoy pasa como texto grande. `aria-hidden` no lo exime (lo ven igual las personas con baja visión): si la inicial baja de 24 px, falla |
| `papel` sobre `secundario` | 3,78 | **no pasa** | pasa | Resaltado `secundario` en h1/h2 (`Sections.tsx:25,100`, `tones.ts:16`): pasa como texto grande. Chip "En curso" a 14 px (`ChipEstado.tsx:5`): **falla** → UX-PANEL-01 |
| `papel` sobre `acento` | 2,84 | no pasa | no pasa | No se usa (bien: `tones.ts:15` usa `tinta`) |
| `papel` sobre `primario` | 1,73 | no pasa | no pasa | No se usa (bien) |

**Indicadores no textuales:**

| Indicador | Contra | Ratio | 3:1 | Dónde |
|---|---|---|---|---|
| Anillo de foco `secundario` (`globals.css:73-76`) | `papel` | 3,78 | pasa | Casi todo el sitio |
| | `superficie` | 3,23 | pasa | Barra del panel |
| | `tinta` | 5,20 | pasa | Pie y trayectoria |
| | `primario` | 2,18 | **no pasa** | Botón "Escribime" dentro de la tarjeta amarilla (`Sections.tsx:72,77`) → UX-TRANS-04 |
| Chip seleccionado `primario` | su borde `tinta` | 11,35 | pasa | `EnlacesPanel.tsx:69`, `metricas/page.tsx:42`, `servicios/formulario.tsx:151`. Contra el chip sin seleccionar (`papel` 1,73; `superficie` 1,48) 1.4.11 no pide 3:1, pero el color es la única diferencia → UX-TRANS-05 (1.4.1) |
| Borde `tinta` de campos y tarjetas | `papel` / `superficie` | 19,68 / 16,81 | pasa | `contorno`, `marca`, `ContactForm.tsx:9` |
| Separador `papel/20` | `tinta` | 1,78 | no aplica | Decorativo (`Contact.tsx:57`) |

Los botones deshabilitados (`disabled:opacity-40` y `-60`) quedan fuera de 1.4.3 (WCAG exime a los controles inactivos).

## 3. Hallazgos

### UX-TRANS-01 — El chip "En curso" no llega al contraste mínimo

Ver UX-PANEL-01 (`ui-ux-panel.md`, en esta carpeta). Es de una sola sección del panel: queda allá con su issue. El ratio está en la tabla de la sección 2 (`papel` sobre `secundario`, 3,78:1).

### UX-TRANS-02 — El foco no se ve en los selectores con el `input` oculto

Ver UX-PANEL-02 (`ui-ux-panel.md`, en esta carpeta). El radio `sr-only` existe en un solo lugar (`src/app/panel/servicios/formulario.tsx:151,158`). Si se vuelve a usar el patrón, conviene una utilidad de foco compartida (ver UX-TRANS-04).

### UX-TRANS-03 — La barra inferior del panel tapa el elemento con foco

- **Página:** todo `/panel` en celular y tablet (menos de 1024 px).
- **Dónde:** `src/components/panel/PanelShell.tsx:23-25` (barra `fixed inset-x-0 bottom-0`) y `:20` (el `main` solo tiene `pb-28`).
- **Qué pasa:** la barra mide unos 67 px de alto (`p-3` y borde de la barra, más el chip: `py-2`, línea de 21 px y bordes) y queda fija encima del contenido. Al avanzar con Tab, el navegador desplaza lo justo para que el siguiente control entre por el borde inferior de la ventana, que es donde está la barra: el control queda debajo de la barra, entero o en parte, sea un botón de 33 a 41 px o un campo de más de 100 px. El `pb-28` del `main` solo sirve al final de la página. El sitio ya resuelve lo mismo arriba con `scroll-pt-24` (`src/app/layout.tsx:22`), pero no hay un equivalente abajo para el panel. Confirmado en la revisión del PR #85 (Playwright con Chromium, build local de `main` con sesión de admin, avanzando con Tab, con y sin `prefers-reduced-motion`): en `/panel/proyectos/nuevo` a 390 px el `textarea` "stack" (104 px de alto) queda entero detrás de la barra (y=800 a 904, con la barra desde y=777); en `/panel/consultas`, a 390 y 768 px, los enlaces de las filas quedan detrás de la barra; en `/panel/usuarios` a 390 px, los botones "Bloquear" y "Desbloquear" quedan tapados en parte (se ven 13 de 33 px).
- **Por qué importa:** WCAG 2.4.11 (AA, foco no tapado) falla cuando el elemento con foco queda oculto por completo.
- **Propuesta:** `scroll-padding-bottom: 80px` en el `html` (en la revisión, inyectarlo dejó todos los controles a la vista) mientras se muestra la barra. El `html` lo renderiza solo el layout raíz (`src/app/layout.tsx:19-23`), así que una clase en el layout del panel no sirve: tiene que ser una regla en `globals.css` del estilo `html:has([data-panel])` con el corte de `lg`, y un `data-panel` en `PanelShell.tsx:13`.
- **Gravedad:** alta.

### UX-TRANS-04 — El anillo de foco no contrasta sobre el amarillo

- **Página:** `/` (sección de servicios) y cualquier control futuro sobre `primario`, `acento`, `secundario` o `terciario`.
- **Dónde:** `src/styles/globals.css:73-76` (`outline: 2px solid var(--color-secundario)`), con el caso concreto en `src/components/sitio/Sections.tsx:72` (tarjeta `bg-primario`) y `:77` (botón "Escribime").
- **Qué pasa:** el anillo `secundario` da 3,78 sobre `papel`, 3,23 sobre `superficie` y 5,20 sobre `tinta`, pero 2,18 sobre `primario`, 1,33 sobre `acento` y 1,20 sobre `terciario`. Hoy el único control sobre un fondo de color es "Escribime"; en producción, a 360 px, es la séptima parada de Tab (después de logo, "Ingresar", menú, los dos botones del hero y la pausa de la banda).
- **Por qué importa:** WCAG 1.4.11 (AA) pide 3:1 para el indicador de foco contra lo que lo rodea. Un anillo de un solo color no puede servir para toda la paleta. Hoy afecta a un solo control y 2.4.7 se cumple (el anillo existe), pero 1.4.11 falla, y según la escala de la sección 1 eso es alta.
- **Propuesta:** anillo en `tinta` por defecto (pasa contra todos los fondos claros: 19,68 sobre `papel`, 11,35 sobre `primario`, 4,33 sobre `terciario`) y en `papel` dentro de las zonas `bg-tinta` (pie, trayectoria). Se puede resolver con una variable `--color-foco` que el contenedor oscuro redefine, y una utilidad para los controles con el `input` oculto (UX-PANEL-02).
- **Gravedad:** alta.

### UX-TRANS-05 — La opción elegida se distingue solo por un relleno de poco contraste

- **Página:** navegación del panel, filtros de métricas, selector de ícono de servicios.
- **Dónde:** `src/components/panel/EnlacesPanel.tsx:69` (`bg-primario` contra `bg-papel`), `src/app/panel/metricas/page.tsx:42` (igual) y `src/app/panel/servicios/formulario.tsx:151` (`has-checked:bg-primario` contra `bg-superficie`).
- **Qué pasa:** el chip actual y los demás tienen el mismo borde, la misma tipografía y el mismo texto; solo cambia el relleno, con 1,73:1 (`primario`/`papel`) o 1,48:1 (`primario`/`superficie`). `aria-current` y el radio lo anuncian bien al lector de pantalla, pero alguien con baja visión o que mira la pantalla al sol no ve cuál está elegido.
- **Por qué importa:** WCAG 1.4.1 (nivel A): el color es la única señal visual del estado, así que falla, y según la escala de la sección 1 eso es alta. 1.4.11 no aplica acá (el relleno contrasta 11,35:1 con su borde `tinta`, y el cambio entre estados no tiene que llegar a 3:1), pero 1,73:1 y 1,48:1 entre los dos rellenos son difíciles de distinguir.
- **Propuesta:** sumar una señal que no sea el color: la sombra de marca (`marca`) solo en el elegido, que es justo el lenguaje de "pieza apretada/levantada" del manual, o un subrayado grueso. Una sola regla para los tres lugares.
- **Gravedad:** alta.

### UX-TRANS-06 — No hay enlace para saltar al contenido

- **Reemplaza a:** UX-PANEL-14 (`ui-ux-panel.md`) y UX-SITIO-13 (`ui-ux-sitio.md`). Un solo issue, este.
- **Página:** todas las del sitio y el panel.
- **Dónde:** `src/app/layout.tsx:24` (el `body` no tiene un primer enlace), `src/components/sitio/Navbar.tsx:65-112` y `src/components/panel/PanelShell.tsx:14-19`.
- **Qué pasa:** en producción, a 1440 px, hay ocho paradas de Tab antes del primer control del `main` en `/` (logo, cinco enlaces, "Contactame", "Ingresar"); en el panel de PC, para un admin, son las seis secciones de la barra lateral más "Volver al sitio". En celular son tres. Los landmarks (`header`, `nav`, `main`, `footer`) están bien puestos, así que 2.4.1 se cumple por esa vía, pero solo para quien navega por landmarks.
- **Por qué importa:** quien usa teclado repite esas paradas en cada página.
- **Propuesta:** un enlace "Saltar al contenido" visible solo con foco (`sr-only focus:not-sr-only`), como primer hijo del `body`, que apunte a `id="contenido"` en cada `main` (o en el `main` de `PanelShell.tsx:20`). Un componente, dos usos.
- **Gravedad:** media.

### UX-TRANS-07 — Los campos del panel están a 14 px: en iPhone hacen zoom al enfocarlos

- **Página:** formularios y búsquedas de `/panel`.
- **Dónde:** `src/app/panel/consultas/page.tsx:29`, `src/app/panel/consultas/[id]/controles.tsx:15`, `src/app/panel/servicios/formulario.tsx:21`, `src/app/panel/proyectos/formulario.tsx:11`, `src/app/panel/usuarios/page.tsx:16` y `src/app/panel/demos/formulario.tsx:11` (todos `text-pequeno`, 0,875 rem).
- **Qué pasa:** Safari en iOS agranda la página al enfocar un campo con letra de menos de 16 px, y no la vuelve a su tamaño al salir. El formulario de contacto no tiene el problema porque usa `text-cuerpo` (`src/components/sitio/ContactForm.tsx:9`).
- **Por qué importa:** el manual pide que el panel se pueda usar en el celular (la barra inferior existe por eso); el zoom desarma el diseño en cada campo.
- **Propuesta:** `text-cuerpo` en los campos (`input`, `select`, `textarea`) del panel; las etiquetas pueden seguir en `text-pequeno`. Sale casi gratis con el componente de UX-TRANS-09.
- **Gravedad:** media.

### UX-TRANS-08 — Los botones se reescriben en cada archivo, con variantes que no coinciden

- **Reemplaza a:** la parte de sistema de UX-SITIO-17 (`ui-ux-sitio.md`): el estilo de los botones de la barra sale del componente compartido.
- **Página:** todas.
- **Dónde:** botón primario grande en `src/components/sitio/Sections.tsx:15`, `src/app/(auth)/ingresar/page.tsx:12`, `src/app/forbidden.tsx:11` y `src/app/(sitio)/cuenta/page.tsx:53`; primario chico en `src/app/panel/consultas/[id]/controles.tsx:16-17`, `src/app/panel/servicios/formulario.tsx:22`, `src/app/panel/proyectos/formulario.tsx:13`, `src/app/panel/demos/formulario.tsx:12`, `src/app/panel/usuarios/page.tsx:93` y `src/app/panel/demos/page.tsx:24`; secundario chico en `src/app/panel/servicios/page.tsx:10`, `src/app/panel/demos/page.tsx:12`, `src/app/panel/proyectos/lista.tsx:10`, `src/app/panel/usuarios/page.tsx:15`; y los chips de filtro, que son otra variante más, en `src/app/panel/metricas/page.tsx:29`.
- **Qué pasa:** hay al menos cuatro variantes reales, copiadas en quince lugares, y ya divergen: el deshabilitado es `opacity-40` en `servicios/page.tsx:10` y `demos/page.tsx:12`, `opacity-60` en los formularios del panel y en `proyectos/lista.tsx:10`, y no existe en los demás (por ejemplo `Sections.tsx:15`, `ingresar/page.tsx:12`, `usuarios/page.tsx:15,93`); "Contactame" de la barra (`src/components/sitio/Navbar.tsx:88`) es `rounded-lg` sin borde ni sombra, mientras el "Contactame" del hero (`Sections.tsx:29`) es un botón de marca; unos llevan `min-h-11` (`ingresar/page.tsx:12`) y otros no.
- **Por qué importa:** inconsistencia con el manual (la pieza con borde, radio y sombra) y cada arreglo de foco o de estado hay que hacerlo quince veces.
- **Propuesta:** un componente `Boton` (y su versión enlace) en `src/components/` con `variante` (`primario`, `secundario`) y `tamano` (`normal`, `chico`), con un solo estilo de deshabilitado. Migrar de a una sección.
- **Gravedad:** media.

### UX-TRANS-09 — Campos y mensajes de formulario: dos estilos y cinco copias del mismo componente

- **Página:** contacto y panel.
- **Dónde:** campo del sitio en `src/components/sitio/ContactForm.tsx:9` (`rounded-lg`, `text-cuerpo`, `py-2.5`) contra el del panel (`contorno`, radio de marca de 1 rem, `text-pequeno`, `py-2`; ver UX-TRANS-07). El mensaje con región viva está copiado en `src/app/panel/consultas/[id]/controles.tsx:20-22`, `src/app/panel/servicios/formulario.tsx:25-27`, `src/app/panel/demos/formulario.tsx:15-17`, `src/app/panel/proyectos/lista.tsx:13-15` y `src/app/panel/proyectos/formulario.tsx:132,340`; el error de campo del sitio es otro (`ContactForm.tsx:129-146`).
- **Qué pasa:** el mismo comportamiento (región viva siempre en el DOM, `aria-invalid`, `aria-describedby`) está bien resuelto, pero a mano en cada archivo. El sitio marca el error con un punto `acento` (`ContactForm.tsx:139`) y el panel no.
- **Por qué importa:** inconsistencia visual entre sitio y panel, y riesgo de que la próxima copia pierda el `aria-describedby` o la región viva.
- **Propuesta:** `Campo` (etiqueta, control, error) y `MensajeEstado` (región viva) compartidos, con el radio y el tamaño que se decidan para los dos lados.
- **Gravedad:** media.

### UX-TRANS-10 — Tamaños de letra fuera de la escala del manual

- **Reemplaza a:** UX-SITIO-16 (`ui-ux-sitio.md`).
- **Página:** `/`, `/proyectos`, `/proyectos/[slug]`, pie.
- **Dónde:** `text-[1.75rem] leading-[1.15]` en `src/components/sitio/Highlight.tsx:22` y `src/app/(sitio)/proyectos/page.tsx:31`; `text-[2.25rem] leading-[1.1]` y `lg:text-[3.75rem]` en `src/components/sitio/Sections.tsx:23`; `text-xs` (12 px) en `src/components/sitio/Contact.tsx:57`, `src/components/sitio/Sections.tsx:138,143`, `src/components/sitio/ShareButton.tsx:34` y `src/app/(sitio)/proyectos/[slug]/page.tsx:74`, más `fontSize: 12` en los ejes de los gráficos (`src/app/panel/metricas/graficos.tsx:61`).
- **Qué pasa:** la escala tiene `text-h1`…`text-pequeno` (`globals.css:17-26`), pero el h2 de celular (1,75 rem) y el h1 grande de PC (3,75 rem) son valores sueltos; el h1 de celular (2,25 rem) es justo `--text-h2` escrito a mano y con otro interlineado (1,1 en vez de 1,15); y 12 px aparece en seis lugares sin token. `proyectos/page.tsx:31` además copia a mano el estilo de `SectionTitle` porque necesita un `h1`.
- **Por qué importa:** "Colores y tipografías solo desde los tokens" (`AGENTS.md`); hoy un cambio de escala no llega a estos lugares.
- **Propuesta:** sumar los tokens que faltan (por ejemplo `--text-h2-movil`, `--text-display`, `--text-mini`), usar `text-h2` donde ya coincide y que `SectionTitle` acepte `as="h1"`.
- **Gravedad:** media.

### UX-TRANS-11 — La metadata no tiene plantilla de título ni datos para compartir

- **Reemplaza a:** la parte de plantilla de título de UX-PANEL-12 (`ui-ux-panel.md`) y de UX-SITIO-09 (`ui-ux-sitio.md`). Lo propio de cada página (el título con el nombre del proyecto, las pestañas del panel que se llaman igual) queda en esos hallazgos.
- **Página:** todas.
- **Dónde:** `src/app/layout.tsx:12-15` (`title: siteConfig.name`, sin `template`), y los títulos de cada página: `src/app/(sitio)/proyectos/page.tsx:12`, `src/app/(sitio)/proyectos/[slug]/page.tsx:23`, `src/app/(sitio)/cuenta/page.tsx:12`, `src/app/(auth)/ingresar/page.tsx:10`, `src/app/panel/layout.tsx:8`.
- **Qué pasa:** en producción la pestaña de `/proyectos` dice solo "Proyectos" y la de `/ingresar`, "Ingresar", sin el nombre del sitio. No hay `openGraph` ni `twitter` (un link compartido sale sin imagen ni descripción armada, y el sitio tiene un botón "Compartir"), ni `themeColor`. El favicon sigue siendo el de Next: lo cubre #79 y no se repite acá.
- **Por qué importa:** WCAG 2.4.2 se cumple, pero con varias pestañas abiertas no se distingue el sitio; y es un portfolio, que vive de que lo compartan.
- **Propuesta:** `title: { default: siteConfig.name, template: "%s · Paperfolio" }` y un bloque `openGraph` con la imagen del hero en el layout raíz (con la convención `opengraph-image` de esta versión de Next).
- **Gravedad:** media.

### UX-TRANS-12 — Radios y chips fuera del sistema

- **Página:** sitio y panel.
- **Dónde:** `rounded-lg` en `src/components/sitio/ContactForm.tsx:9`, `src/components/sitio/Navbar.tsx:88,96`, `src/components/sitio/MenuCuenta.tsx:12`, `src/components/sitio/StackBand.tsx:38`, `src/components/sitio/Sections.tsx:131` y `src/app/(sitio)/proyectos/[slug]/page.tsx:67`; `rounded-md` en `Sections.tsx:138` y `[slug]/page.tsx:74,117`; `rounded-sm` en `Sections.tsx:106,110`; y `borderRadius: 8` en el tooltip de los gráficos (`src/app/panel/metricas/graficos.tsx:52`). Chips de estado: `rounded-full` en `src/components/panel/ChipEstado.tsx:13` y `contorno` (radio de marca) en `src/app/panel/servicios/page.tsx:48`, `src/app/panel/demos/page.tsx:48` y `src/app/panel/usuarios/page.tsx:114-115`.
- **Qué pasa:** hay un solo radio de marca (`--radius-marca`, `globals.css:29`), y además otros tres (`rounded-lg`, `rounded-md`, `rounded-sm`) y un valor en línea que nadie decidió. Los chips de estado tienen dos formas según la sección.
- **Por qué importa:** inconsistencia con el manual; no es un error de accesibilidad.
- **Propuesta:** decidir si existe un "radio chico" (y volverlo token, por ejemplo `--radius-chico`) o llevar todo al de marca; un solo componente `Chip` para los estados del panel.
- **Gravedad:** baja.

### UX-TRANS-13 — La barra y el pie se repiten en cada página; `/cuenta` no tiene pie

- **Reemplaza a:** la parte de sistema de UX-SITIO-05 (`ui-ux-sitio.md`): el marco compartido en el layout. Lo de `/ingresar` y el 403 queda allá.
- **Página:** `/`, `/proyectos`, `/proyectos/[slug]`, `/cuenta`.
- **Dónde:** `src/app/(sitio)/page.tsx:11,21`, `src/app/(sitio)/proyectos/page.tsx:21,46`, `src/app/(sitio)/proyectos/[slug]/page.tsx:29,42` y `src/app/(sitio)/cuenta/page.tsx:65-74` (sin `Footer`); el layout del grupo (`src/app/(sitio)/layout.tsx:4-10`) solo monta el contador de visitas.
- **Qué pasa:** cada página arma su propio marco; la que se olvidó del pie quedó distinta.
- **Por qué importa:** orientación y consistencia (WCAG 3.2.3, navegación consistente, se cumple hoy en la barra, pero depende de que nadie se olvide).
- **Propuesta:** llevar `Navbar` (con `CuentaBarra` en su Suspense) y `Footer` a `src/app/(sitio)/layout.tsx`.
- **Gravedad:** baja.

### UX-TRANS-14 — El botón de pausa de la banda sigue visible cuando no hay animación

- **Página:** `/`.
- **Dónde:** `src/components/sitio/StackBand.tsx:33-41`, con `globals.css:99-101` (sin animación con `prefers-reduced-motion`).
- **Qué pasa:** con movimiento reducido (verificado en producción: `animation-name: none`) el botón "Pausar animación" sigue ahí y no hace nada visible. Además combina `aria-pressed` con un texto que cambia ("Pausar"/"Reanudar"): el lector anuncia "Reanudar animación, presionado", que se contradice.
- **Por qué importa:** pulido; un control que no hace nada confunde.
- **Propuesta:** ocultarlo con `motion-reduce:hidden` y dejar un texto fijo con `aria-pressed`, o el texto que cambia sin `aria-pressed`.
- **Gravedad:** baja.

### UX-TRANS-15 — Enlaces de texto con poco alto de toque

- **Página:** `/`, `/proyectos`, `/ingresar`, pie.
- **Dónde:** `src/components/sitio/Contact.tsx:45,50` (18 px de alto), `src/components/sitio/Sections.tsx:155,159` y `src/components/sitio/ShareButton.tsx:31` (21 px), `src/app/(sitio)/proyectos/page.tsx:25` (18 px), `src/app/(auth)/ingresar/page.tsx:112` (21 px) y `src/components/sitio/Navbar.tsx:79` (18 px, en PC). Medido en producción a 360, 768 y 1440 px.
- **Qué pasa:** ningún control queda debajo de 24 px con vecinos pegados: todos pasan WCAG 2.5.8 por la excepción de espaciado (los separan `gap-2` a `gap-6`). Pero en celular son blancos chicos para el dedo, sobre todo los tres enlaces seguidos de cada tarjeta de proyecto.
- **Por qué importa:** pulido de usabilidad en táctil; no falla AA.
- **Propuesta:** `inline-flex min-h-6 items-center` (o `py-1`) en los enlaces de texto sueltos; mejor si sale de una clase compartida de "enlace de texto".
- **Gravedad:** baja.

## 4. Lo que está bien y conviene mantener

- `lang="es-AR"` en el `html` (`src/app/layout.tsx:20`) y Onest cargada con `next/font`.
- Un anillo de foco global con `:focus-visible` (`globals.css:73-76`): en producción, todas las paradas de Tab medidas lo muestran. Falta extenderlo, no reemplazarlo (UX-TRANS-02 y 04).
- Movimiento: GSAP solo dentro de `gsap.matchMedia(MOTION_OK)` (`src/lib/gsap.ts:9`, `HeroMotion.tsx:17-26`, `Reveal.tsx:22-33`), los gráficos no se animan con movimiento reducido (`metricas/graficos.tsx:25-40`), y el CSS apaga la banda, el scroll suave y el "apretar" (`globals.css:95-108`). La banda tiene pausa (WCAG 2.2.2). Verificado en producción.
- Menú móvil: deja `main` y `footer` inertes, toma el foco, cierra con Escape y devuelve el foco al botón (`Navbar.tsx:36-62`). En producción, el Tab queda dentro de la barra y el menú.
- `scroll-pt-24` compensa la barra fija del sitio al saltar a una sección (`layout.tsx:22`).
- Formularios: `aria-invalid`, `aria-describedby`, foco en el primer error y regiones vivas que están siempre en el DOM (`ContactForm.tsx:61-65,106-116` y los formularios del panel).
- Gráficos con `aria-hidden` y los mismos datos en una tabla con `caption` (`metricas/graficos.tsx:65`, `metricas/page.tsx:51-58`).
- Ilustraciones decorativas con `aria-hidden` (`Illustrations.tsx`), y `aria-current` en la navegación del panel y los filtros.
- Cero hex fuera de `globals.css` en `src/` (búsqueda de `#[0-9a-f]{3,8}`), y ningún color de Tailwind por defecto.
- Sin scroll horizontal en `/`, `/proyectos` e `/ingresar` a 360, 768 y 1440 px (medido en producción).

## 5. Issues propuestos

Para pasarlos a issues con `crear-issue` después de revisar esta tabla: uno por hallazgo, con `tipo:audit` y el título `Auditoría UI/UX transversal: <hallazgo>` (la regla de `crear-issue`). UX-TRANS-07, 08, 09 y 12 se resuelven mejor juntos (los componentes compartidos), pero quedan como issues separados para poder cerrarlos de a uno. UX-TRANS-01 y 02 no están: son UX-PANEL-01 y 02 y se abren desde la auditoría del panel. Cuando una fila dice "reemplaza a", el hallazgo de la otra auditoría no se abre aparte.

| Título | Labels sugeridos | Hallazgo |
|---|---|---|
| Auditoría UI/UX transversal: evitar que la barra inferior del panel tape el foco | `tipo:audit`, `area:panel`, `prioridad:alta` | UX-TRANS-03 |
| Auditoría UI/UX transversal: hacer que el anillo de foco contraste sobre todos los fondos | `tipo:audit`, `area:diseno`, `prioridad:alta` | UX-TRANS-04 |
| Auditoría UI/UX transversal: marcar la opción elegida con algo más que el color | `tipo:audit`, `area:diseno`, `prioridad:alta` | UX-TRANS-05 |
| Auditoría UI/UX transversal: agregar un enlace para saltar al contenido | `tipo:audit`, `area:web`, `area:panel`, `prioridad:media` | UX-TRANS-06 (reemplaza a UX-PANEL-14 y UX-SITIO-13) |
| Auditoría UI/UX transversal: usar letra de 16 px en los campos del panel | `tipo:audit`, `area:panel`, `prioridad:media` | UX-TRANS-07 |
| Auditoría UI/UX transversal: unificar los botones en un componente | `tipo:audit`, `area:diseno`, `prioridad:media` | UX-TRANS-08 (reemplaza la parte de sistema de UX-SITIO-17) |
| Auditoría UI/UX transversal: unificar los campos y los mensajes de formulario | `tipo:audit`, `area:diseno`, `prioridad:media` | UX-TRANS-09 |
| Auditoría UI/UX transversal: completar la escala tipográfica con los tamaños que faltan | `tipo:audit`, `area:diseno`, `prioridad:media` | UX-TRANS-10 (reemplaza a UX-SITIO-16) |
| Auditoría UI/UX transversal: agregar la plantilla de título y Open Graph a la metadata | `tipo:audit`, `area:web`, `prioridad:media` | UX-TRANS-11 (reemplaza la plantilla de UX-PANEL-12 y UX-SITIO-09) |
| Auditoría UI/UX transversal: decidir los radios y unificar los chips | `tipo:audit`, `area:diseno`, `prioridad:baja` | UX-TRANS-12 |
| Auditoría UI/UX transversal: llevar la barra y el pie al layout del sitio | `tipo:audit`, `area:web`, `prioridad:baja` | UX-TRANS-13 (reemplaza la parte de sistema de UX-SITIO-05) |
| Auditoría UI/UX transversal: ajustar el botón de pausa de la banda del stack | `tipo:audit`, `area:web`, `prioridad:baja` | UX-TRANS-14 |
| Auditoría UI/UX transversal: agrandar el área de toque de los enlaces de texto | `tipo:audit`, `area:diseno`, `prioridad:baja` | UX-TRANS-15 |
