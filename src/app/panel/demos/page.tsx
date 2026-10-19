import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listarDemosAdmin } from "@/lib/demos-admin";
import { requerirRol } from "@/lib/permisos";
import { AccionesDemos, BOTON, BotonBorrarDemo, ControlesDemo } from "./controles";
import { RUTA_DEMOS, RUTA_NUEVA_DEMO, rutaEdicion } from "./rutas";

export const metadata: Metadata = { title: "Demos" };

// Solo admin. El layout del panel deja pasar al operador: el rol se exige acá, antes de leer.
export default async function DemosPage() {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  await requerirRol(RUTA_DEMOS, "admin");
  const grupos = await listarDemosAdmin();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h2 font-bold">Demos</h1>
        <Link href={RUTA_NUEVA_DEMO} className="marca apretable bg-tinta px-5 py-2 text-pequeno font-bold text-papel">
          Nueva demo
        </Link>
      </div>
      <p className="mt-2 text-pequeno">
        Por proyecto. El detalle de cada proyecto muestra sus demos activas, en este orden.
      </p>

      {grupos.length === 0 ? (
        <p className="contorno mt-8 bg-superficie p-8 text-center">Todavía no hay demos en la base.</p>
      ) : (
        <AccionesDemos>
          <div className="mt-8 grid gap-8">
            {grupos.map((g) => (
              <section key={g.proyecto?.id ?? "sin-proyecto"} aria-label={g.proyecto?.nombre ?? "Sin proyecto"}>
                <h2 className="text-h3 font-bold">{g.proyecto?.nombre ?? "Sin proyecto"}</h2>
                {!g.proyecto && (
                  <p className="mt-1 text-pequeno">Su proyecto ya no existe: no se muestran en el sitio.</p>
                )}
                <ol className="mt-3 flex flex-col gap-3">
                  {g.demos.map((d, i) => (
                    <li key={d.id} className="contorno flex flex-wrap items-center gap-4 bg-papel p-4">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{d.titulo}</span>
                          <span className={`contorno px-2 text-pequeno font-bold ${d.activa ? "bg-primario" : "bg-superficie"}`}>
                            {d.activa ? "Activa" : "Inactiva"}
                          </span>
                        </p>
                        <p className="mt-1 text-pequeno break-all">{d.url}</p>
                        {d.descripcion && <p className="mt-1 text-pequeno break-words">{d.descripcion}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Las huérfanas no se ordenan: no se muestran, y vienen de proyectos distintos. */}
                        <ControlesDemo
                          id={d.id}
                          titulo={d.titulo}
                          activa={d.activa}
                          primera={i === 0}
                          ultima={i === g.demos.length - 1}
                          ordenable={g.proyecto !== null}
                        />
                        <Link href={rutaEdicion(d.id)} className={BOTON} aria-label={`Editar ${d.titulo}`}>
                          Editar
                        </Link>
                        <BotonBorrarDemo id={d.id} titulo={d.titulo} />
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </AccionesDemos>
      )}
    </>
  );
}
