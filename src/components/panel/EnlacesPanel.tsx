"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EnlacePanel } from "./enlaces";
import { esActual } from "./enlaces";

const base =
  "apretable contorno flex items-center justify-center px-4 py-2 text-pequeno font-bold lg:justify-start";

/** Enlaces del panel: marca la sección actual (`aria-current`) según la ruta. */
export function EnlacesPanel({ enlaces, vertical }: { enlaces: EnlacePanel[]; vertical: boolean }) {
  const pathname = usePathname();
  return (
    // Abajo, en celular: centrada si entra y con scroll horizontal si no (el admin tiene más secciones que ancho).
    // El padding deja lugar a la sombra y al corrimiento de `apretable`, que el overflow recortaría.
    <ul className={vertical ? "flex flex-col gap-3" : "mx-auto flex w-max max-w-full items-center gap-2 overflow-x-auto pr-1 pb-1"}>
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
