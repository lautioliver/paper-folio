import { connection } from "next/server";
import { requerirRol } from "@/lib/permisos";
import { VERSION_NUEVO } from "@/lib/version-formulario";
import { FormularioServicio } from "../formulario";
import { RUTA_NUEVO_SERVICIO } from "../rutas";

export default async function NuevoServicioPage() {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  await requerirRol(RUTA_NUEVO_SERVICIO, "admin");
  return (
    <>
      <h1 className="text-h2 font-bold">Nuevo servicio</h1>
      <FormularioServicio
        id={null}
        version={VERSION_NUEVO}
        inicial={{ titulo: "", descripcion: "", ilustracion: "icono", icono: "", imagen: "", publicado: false }}
      />
    </>
  );
}
