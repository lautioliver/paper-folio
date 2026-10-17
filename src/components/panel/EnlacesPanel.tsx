"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { EnlacePanel } from "./enlaces";
import { esActual } from "./enlaces";

const base =
  "apretable contorno flex items-center justify-center px-4 py-2 text-pequeno font-bold lg:justify-start";

/** Enlaces del panel: marca la sección actual (`aria-current`) según la ruta. */
export function EnlacesPanel({ enlaces, vertical }: { enlaces: EnlacePanel[]; vertical: boolean }) {
  const pathname = usePathname();
  const lista = useRef<HTMLUListElement>(null);

  // En la barra con scroll, la sección actual queda a la vista al cargar y al navegar. Sin `smooth`: no hay
  // animación que respetar con reduced-motion. `nearest` no mueve la página (la barra es fija y ya se ve).
  useEffect(() => {
    if (vertical) return;
    lista.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname, vertical]);

  return (
    // Abajo, en celular: centrada si entra y con scroll horizontal si no (el admin tiene más secciones que ancho).
    // Con overflow, la lista recorta lo que sale de su caja: el padding en los cuatro lados deja entero el anillo de
    // foco (outline de 2 px a 2 px del chip), la sombra y el corrimiento de `apretable`; el margen vertical negativo
    // compensa el alto, y `scroll-px` hace que `scrollIntoView` y el foco con Tab dejen ese margen a la vista.
    <ul
      ref={lista}
      // Chrome no desplaza la lista si el chip que recibe el foco con Tab ya asoma en parte: se fuerza, así el anillo
      // de foco se ve entero (con el margen de `scroll-px`).
      onFocus={vertical ? undefined : (e) => e.target.scrollIntoView({ block: "nearest", inline: "nearest" })}
      className={
        vertical
          ? "flex flex-col gap-3"
          : "mx-auto -my-1.5 flex w-max max-w-full scroll-px-1.5 items-center gap-2 overflow-x-auto p-1.5"
      }
    >
      {enlaces.map((e) => {
        const actual = esActual(pathname, e.href);
        return (
          <li key={e.href} className="shrink-0">
            <Link
              href={e.href}
              aria-current={actual ? "page" : undefined}
              className={`${base} ${actual ? "bg-primario" : "bg-papel"} text-tinta`}
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
