import type { ReactNode } from "react";
import type { Rol } from "@/models/Usuario";
import { enlacesPara } from "./enlaces";
import { EnlacesPanel } from "./EnlacesPanel";

/**
 * Barra lateral desde 1024 px y barra inferior en celular (manual de marca). Muestra las secciones del
 * rol: ocultar una sección no la protege (cada página y acción exige su rol).
 */
export function PanelShell({ rol, children }: { rol: Rol; children: ReactNode }) {
  const enlaces = enlacesPara(rol);
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 border-r-2 border-tinta bg-superficie p-6 lg:block">
        <p className="mb-6 text-h3 font-bold">Panel</p>
        <nav aria-label="Panel">
          <EnlacesPanel enlaces={enlaces} vertical />
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 pt-8 pb-28 sm:px-6 lg:pb-12">
        {children}
      </main>
      <nav
        aria-label="Panel"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-tinta bg-superficie p-3 lg:hidden"
      >
        <EnlacesPanel enlaces={enlaces} vertical={false} />
      </nav>
    </div>
  );
}
