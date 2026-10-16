import { notFound } from "next/navigation";
import { requerirRol } from "@/lib/permisos";
import { valoresDeProyecto } from "@/lib/proyecto-entrada";
import { obtenerProyectoAdmin } from "@/lib/proyectos-admin";
import { FormularioProyecto } from "../formulario";
import { rutaEditarProyecto } from "../ruta";

/** Edición de un proyecto. Primero el rol (antes de saber si el id existe); un id que no existe da 404. */
export async function EditarProyecto({ id }: { id: string }) {
  await requerirRol(rutaEditarProyecto(id), "admin");
  const proyecto = await obtenerProyectoAdmin(id);
  if (!proyecto) notFound();
  return (
    <>
      <h1 className="text-h2 font-bold">Editar «{proyecto.nombre}»</h1>
      <FormularioProyecto id={proyecto.id} valores={valoresDeProyecto(proyecto)} version={proyecto.version} />
    </>
  );
}
