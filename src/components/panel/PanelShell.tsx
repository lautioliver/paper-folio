import Link from "next/link";
import type { ReactNode } from "react";

const ENLACES = [{ href: "/panel/consultas", etiqueta: "Consultas" }];

const base =
  "apretable contorno flex items-center justify-center px-4 py-2 text-pequeno font-bold lg:justify-start";

function Enlaces({ vertical }: { vertical: boolean }) {
  return (
    <ul
      className={
        vertical
          ? "flex flex-col gap-3"
          : "flex items-center justify-around gap-2"
      }
    >
      {ENLACES.map((e) => (
        // Hoy hay una sola sección y siempre es la actual.
        <li key={e.href}>
          <Link
            href={e.href}
            aria-current="page"
            className={`${base} bg-primario text-tinta`}
          >
            {e.etiqueta}
          </Link>
        </li>
      ))}
      <li>
        <Link href="/" className={`${base} bg-papel text-tinta`}>
          Volver al sitio
        </Link>
      </li>
    </ul>
  );
}

/** Barra lateral desde 1024 px y barra inferior en celular (manual de marca). */
export function PanelShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 border-r-2 border-tinta bg-superficie p-6 lg:block">
        <p className="mb-6 text-h3 font-bold">Panel</p>
        <nav aria-label="Panel">
          <Enlaces vertical />
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 pt-8 pb-28 sm:px-6 lg:pb-12">
        {children}
      </main>
      <nav
        aria-label="Panel"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-tinta bg-superficie p-3 lg:hidden"
      >
        <Enlaces vertical={false} />
      </nav>
    </div>
  );
}
