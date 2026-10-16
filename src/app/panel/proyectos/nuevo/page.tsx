import type { Metadata } from "next";
import { connection } from "next/server";
import { requerirRol } from "@/lib/permisos";
import { valoresDeProyecto } from "@/lib/proyecto-entrada";
import { VERSION_NUEVO } from "@/lib/version-formulario";
import { FormularioProyecto } from "../formulario";
import { RUTA_NUEVO_PROYECTO } from "../ruta";

export const metadata: Metadata = { title: "Nuevo proyecto" };

export default async function NuevoProyectoPage() {
  await connection(); // ver /panel/proyectos
  await requerirRol(RUTA_NUEVO_PROYECTO, "admin");
  return (
    <>
      <h1 className="text-h2 font-bold">Nuevo proyecto</h1>
      <FormularioProyecto valores={valoresDeProyecto()} version={VERSION_NUEVO} />
    </>
  );
}
