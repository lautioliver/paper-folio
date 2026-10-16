import Link from "next/link";
import type { ReactNode } from "react";
import type { Rol } from "@/models/Usuario";
import { EnlaceActual } from "./EnlaceActual";
import { CLASE_ENLACE, enlacesPara } from "./enlaces";

function Enlaces({ vertical, rol }: { vertical: boolean; rol: Rol }) {
  return (
    <ul
      className={
        vertical
          ? "flex flex-col gap-3"
          : "flex items-center justify-around gap-2"
      }
    >
      {enlacesPara(rol).map((e) => (
        <li key={e.href}>
          <EnlaceActual href={e.href} etiqueta={e.etiqueta} />
        </li>
      ))}
      <li>
        <Link href="/" className={`${CLASE_ENLACE} bg-papel text-tinta`}>
          Volver al sitio
        </Link>
      </li>
    </ul>
  );
}

/** Barra lateral desde 1024 px y barra inferior en celular (manual de marca). */
export function PanelShell({ children, rol }: { children: ReactNode; rol: Rol }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 border-r-2 border-tinta bg-superficie p-6 lg:block">
        <p className="mb-6 text-h3 font-bold">Panel</p>
        <nav aria-label="Panel">
          <Enlaces vertical rol={rol} />
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 pt-8 pb-28 sm:px-6 lg:pb-12">
        {children}
      </main>
      <nav
        aria-label="Panel"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-tinta bg-superficie p-3 lg:hidden"
      >
        <Enlaces vertical={false} rol={rol} />
      </nav>
    </div>
  );
}
