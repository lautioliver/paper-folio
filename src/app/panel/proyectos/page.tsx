import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requerirRol } from "@/lib/permisos";
import { listarProyectosAdmin } from "@/lib/proyectos-admin";
import { ListaProyectos } from "./lista";
import { RUTA_NUEVO_PROYECTO, RUTA_PROYECTOS_PANEL } from "./ruta";

export const metadata: Metadata = { title: "Proyectos" };

// Solo admin. El layout del panel deja pasar al operador: el rol se exige acá, antes de leer.
export default async function ProyectosPanelPage() {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  await requerirRol(RUTA_PROYECTOS_PANEL, "admin");
  const proyectos = await listarProyectosAdmin();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h2 font-bold">Proyectos</h1>
        <Link
          href={RUTA_NUEVO_PROYECTO}
          className="marca apretable bg-tinta px-5 py-2 text-pequeno font-bold text-papel"
        >
          Nuevo proyecto
        </Link>
      </div>
      <p className="mt-2 text-pequeno">
        En el orden en que se muestran en el sitio. Solo se ven los publicados.
      </p>
      {proyectos.length === 0 ? (
        <p className="contorno mt-8 bg-superficie p-8 text-center">
          Todavía no hay proyectos en la base: el sitio muestra los del contenido estático. Cuando crees el
          primero, el sitio va a mostrar solo los proyectos publicados de la base (ADR-003).
        </p>
      ) : (
        <ListaProyectos proyectos={proyectos} />
      )}
    </>
  );
}
