import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { proyectosParaDemos } from "@/lib/demos-admin";
import { requerirRol } from "@/lib/permisos";
import { VERSION_NUEVO } from "@/lib/version-formulario";
import { RUTA_NUEVO_PROYECTO } from "../../proyectos/ruta";
import { FormularioDemo } from "../formulario";
import { RUTA_NUEVA_DEMO } from "../rutas";

export const metadata: Metadata = { title: "Nueva demo" };

export default async function NuevaDemoPage() {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  await requerirRol(RUTA_NUEVA_DEMO, "admin");
  const proyectos = await proyectosParaDemos();
  return (
    <>
      <h1 className="text-h2 font-bold">Nueva demo</h1>
      {proyectos.length === 0 ? (
        <p className="contorno mt-6 bg-superficie p-8">
          Una demo va siempre con un proyecto, y todavía no hay proyectos en la base.{" "}
          <Link href={RUTA_NUEVO_PROYECTO} className="font-bold underline">
            Creá el primero
          </Link>
          .
        </p>
      ) : (
        <FormularioDemo
          id={null}
          version={VERSION_NUEVO}
          proyectos={proyectos}
          inicial={{ proyecto: "", titulo: "", url: "", descripcion: "", activa: true }}
        />
      )}
    </>
  );
}
