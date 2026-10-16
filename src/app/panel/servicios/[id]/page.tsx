import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requerirRol } from "@/lib/permisos";
import { obtenerServicioAdmin } from "@/lib/servicios-admin";
import { FormularioServicio } from "../formulario";
import { rutaEdicion } from "../rutas";

export default async function EditarServicioPage({ params }: PageProps<"/panel/servicios/[id]">) {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  const { id } = await params;
  await requerirRol(rutaEdicion(id), "admin");
  const servicio = await obtenerServicioAdmin(id);
  if (!servicio) notFound();
  return (
    <>
      <h1 className="text-h2 font-bold">Editar servicio</h1>
      <FormularioServicio
        id={servicio.id}
        inicial={{
          titulo: servicio.titulo,
          descripcion: servicio.descripcion,
          ilustracion: servicio.icono || !servicio.imagen ? "icono" : "imagen",
          icono: servicio.icono ?? "",
          imagen: servicio.imagen ?? "",
          publicado: servicio.publicado,
        }}
      />
    </>
  );
}
