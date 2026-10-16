import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { obtenerDemoAdmin, proyectosParaDemos } from "@/lib/demos-admin";
import { requerirRol } from "@/lib/permisos";
import { FormularioDemo } from "../formulario";
import { rutaEdicion } from "../rutas";

export const metadata: Metadata = { title: "Editar demo" };

export default async function EditarDemoPage({ params }: PageProps<"/panel/demos/[id]">) {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  const { id } = await params;
  await requerirRol(rutaEdicion(id), "admin");
  const demo = await obtenerDemoAdmin(id);
  if (!demo) notFound();
  const proyectos = await proyectosParaDemos();
  return (
    <>
      <h1 className="text-h2 font-bold">Editar demo</h1>
      <FormularioDemo
        id={demo.id}
        proyectos={proyectos}
        inicial={{
          // Una demo huérfana arranca sin proyecto elegido: hay que elegir uno que exista.
          proyecto: proyectos.some((p) => p.id === demo.proyecto) ? demo.proyecto : "",
          titulo: demo.titulo,
          url: demo.url,
          descripcion: demo.descripcion,
          activa: demo.activa,
        }}
      />
    </>
  );
}
