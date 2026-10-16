"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLASE_ENLACE } from "./enlaces";

/** Enlace del menú del panel: marcado (`aria-current`) si la ruta actual es su sección o está adentro. */
export function EnlaceActual({ href, etiqueta }: { href: string; etiqueta: string }) {
  const ruta = usePathname();
  const actual = ruta === href || ruta.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={actual ? "page" : undefined}
      className={`${CLASE_ENLACE} ${actual ? "bg-primario" : "bg-papel"} text-tinta`}
    >
      {etiqueta}
    </Link>
  );
}
