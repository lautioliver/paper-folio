import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PanelShell } from "@/components/panel/PanelShell";
import { requerirRol } from "@/lib/permisos";

export const metadata: Metadata = {
  title: "Panel",
  // Datos de visitantes: que ningún buscador lo indexe, aunque la ruta ya exige sesión.
  robots: { index: false, follow: false },
};

/**
 * Guarda del panel: sin sesión redirige a `/ingresar`, sin rol de operador o admin responde 403.
 * El rol se relee de la base en cada render (ADR-002 R-3). La guarda envuelve a la página, así que
 * nada del panel se renderiza antes de pasarla. Cada página vuelve a llamar a `requerirRol`: el
 * layout no se vuelve a ejecutar en las navegaciones del cliente.
 */
async function Guarda({ children }: { children: React.ReactNode }) {
  // Auth.js genera valores aleatorios: se pide el request antes, así nada se intenta prerenderizar.
  await connection();
  await requerirRol("/panel/consultas", "operador", "admin");
  return <PanelShell>{children}</PanelShell>;
}

// `auth()` lee cookies (dato dinámico): con cacheComponents tiene que ir dentro de Suspense.
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <Suspense fallback={null}>
      <Guarda>{children}</Guarda>
    </Suspense>
  );
}
