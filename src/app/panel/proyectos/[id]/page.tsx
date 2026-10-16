import type { Metadata } from "next";
import { Suspense } from "react";
import { EditarProyecto } from "./editar";

export const metadata: Metadata = { title: "Editar proyecto" };

// `requerirRol` lee la sesión (dato dinámico): con cacheComponents va dentro de Suspense. El control de
// permisos está en `EditarProyecto`, no en el layout (ver src/app/panel/layout.tsx).
export default function EditarProyectoPage({ params }: PageProps<"/panel/proyectos/[id]">) {
  return (
    <Suspense fallback={<p className="text-pequeno">Cargando el proyecto…</p>}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: PageProps<"/panel/proyectos/[id]">["params"] }) {
  const { id } = await params;
  return <EditarProyecto id={id} />;
}
