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
    <ul className={vertical ? "flex flex-col gap-3" : "flex items-center justify-around gap-2"}>
      {enlaces.map((e) => {
        const actual = esActual(pathname, e.href);
        return (
          <li key={e.href}>
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
      <li>
        <Link href="/" className={`${base} bg-papel text-tinta`}>
          Volver al sitio
        </Link>
      </li>
    </ul>
  );
}
