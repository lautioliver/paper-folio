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
 * Guarda del shell del panel: sin sesión redirige a `/ingresar`, sin rol de operador o admin responde 403.
 * OJO: el layout NO protege a las páginas. Next no impide que un segmento hijo se renderice ni que
 * aparezca en el RSC Payload aunque el layout redirija, y el layout no se vuelve a ejecutar en las
 * navegaciones del cliente. Por eso cada página y cada acción bajo `/panel` tiene que llamar a
 * `requerirRol` con los roles de su sección (rol releído de la base, ADR-002 R-3) ANTES de leer datos.
 * El rol que devuelve acá solo decide qué secciones muestra el menú.
 */
async function Guarda({ children }: { children: React.ReactNode }) {
  // Auth.js genera valores aleatorios: se pide el request antes, así nada se intenta prerenderizar.
  await connection();
  const { rol } = await requerirRol("/panel/consultas", "operador", "admin");
  return <PanelShell rol={rol}>{children}</PanelShell>;
}

// `auth()` lee cookies (dato dinámico): con cacheComponents tiene que ir dentro de Suspense.
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <Suspense fallback={null}>
      <Guarda>{children}</Guarda>
    </Suspense>
  );
}
