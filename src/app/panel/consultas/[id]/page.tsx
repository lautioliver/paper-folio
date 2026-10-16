import type { Metadata } from "next";
import { Suspense } from "react";
import { DetalleConsulta } from "./detalle";

export const metadata: Metadata = { title: "Consulta" };

// `requerirRol` lee la sesión (dato dinámico): con cacheComponents va dentro de Suspense. El control de
// permisos está en `DetalleConsulta`, no en el layout (ver src/app/panel/layout.tsx).
export default function ConsultaPage({
  params,
}: PageProps<"/panel/consultas/[id]">) {
  return (
    <Suspense fallback={<p className="text-pequeno">Cargando la consulta…</p>}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({
  params,
}: {
  params: PageProps<"/panel/consultas/[id]">["params"];
}) {
  const { id } = await params;
  return <DetalleConsulta id={id} />;
}
