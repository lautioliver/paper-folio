"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { EnlacePanel } from "./enlaces";
import { esActual } from "./enlaces";

/** Celular y tablet: la barra inferior (`lg:hidden` en `PanelShell`). */
const BARRA_INFERIOR = "(max-width: 1023.98px)";

/**
 * Desplaza solo la lista hasta que `el` se vea entero (con el margen de `scroll-px`). Sin `smooth`: no hay animación
 * que respetar con reduced-motion. `nearest` no hace nada si ya se ve.
 */
function aLaVista(el: Element | null | undefined): void {
  el?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/**
 * Chrome no desplaza la lista si el chip que recibe el foco con Tab ya asoma en parte: se fuerza, así el anillo se ve
 * entero. Solo con foco de teclado (`:focus-visible`): con el mouse o un toque, el foco llega en el mousedown, y mover el
 * chip antes del mouseup haría que el clic no llegue al enlace.
 */
function alEnfocar(e: React.FocusEvent<HTMLUListElement>): void {
  if (e.target.matches(":focus-visible")) aLaVista(e.target);
}

const base =
  "apretable contorno flex items-center justify-center px-4 py-2 text-pequeno font-bold lg:justify-start";

/** Enlaces del panel: marca la sección actual (`aria-current`) según la ruta. */
export function EnlacesPanel({ enlaces, vertical }: { enlaces: EnlacePanel[]; vertical: boolean }) {
  const pathname = usePathname();
  const lista = useRef<HTMLUListElement>(null);

  // En la barra con scroll, la sección actual queda a la vista al cargar, al navegar y cuando la barra aparece (girar
  // la tablet o achicar la ventana desde el diseño de PC, donde estaba oculta y `scrollIntoView` no hacía nada).
  useEffect(() => {
    if (vertical) return;
    const mostrarActual = () => aLaVista(lista.current?.querySelector('[aria-current="page"]'));
    mostrarActual();
    const consulta = window.matchMedia(BARRA_INFERIOR);
    consulta.addEventListener("change", mostrarActual);
    return () => consulta.removeEventListener("change", mostrarActual);
  }, [pathname, vertical]);

  return (
    // Abajo, en celular: centrada si entra y con scroll horizontal si no (el admin tiene más secciones que ancho).
    // Con overflow, la lista recorta lo que sale de su caja: el padding de 8 px en los cuatro lados deja entero el
    // anillo de foco (outline de 2 px a 2 px del chip, `globals.css`) más el corrimiento de `apretable` (2 px), con 2 px
    // de margen; el margen vertical negativo compensa el alto, y `scroll-px` hace que `scrollIntoView` deje ese margen.
    <ul
      ref={lista}
      onFocus={vertical ? undefined : alEnfocar}
      className={
        vertical
          ? "flex flex-col gap-3"
          : "mx-auto -my-2 flex w-max max-w-full scroll-px-2 items-center gap-2 overflow-x-auto p-2"
      }
    >
      {enlaces.map((e) => {
        const actual = esActual(pathname, e.href);
        return (
          <li key={e.href} className="shrink-0">
            <Link
              href={e.href}
              aria-current={actual ? "page" : undefined}
              className={`${base} ${actual ? "bg-primario elegido" : "bg-papel"} text-tinta`}
            >
              {e.etiqueta}
            </Link>
          </li>
        );
      })}
      <li className="shrink-0">
        <Link href="/" className={`${base} bg-papel text-tinta`}>
          Volver al sitio
        </Link>
      </li>
    </ul>
  );
}
