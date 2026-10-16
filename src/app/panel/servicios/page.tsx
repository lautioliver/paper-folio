import Link from "next/link";
import { connection } from "next/server";
import { IlustracionServicio } from "@/components/sitio/Illustrations";
import { requerirRol } from "@/lib/permisos";
import { listarServiciosAdmin } from "@/lib/servicios-admin";
import { borrarServicioAccion, moverServicioAccion, publicarServicioAccion } from "./acciones";
import { BotonBorrar } from "./boton-borrar";
import { RUTA_NUEVO_SERVICIO, RUTA_SERVICIOS, rutaEdicion } from "./rutas";

const boton = "apretable contorno bg-papel px-3 py-1 text-pequeno font-bold disabled:opacity-40";

export default async function ServiciosPage() {
  await connection(); // Auth.js usa valores aleatorios: nada de esto se prerenderiza.
  await requerirRol(RUTA_SERVICIOS, "admin");
  const servicios = await listarServiciosAdmin();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h2 font-bold">Servicios</h1>
        <Link
          href={RUTA_NUEVO_SERVICIO}
          className="marca apretable bg-tinta px-5 py-2 text-pequeno font-bold text-papel"
        >
          Nuevo servicio
        </Link>
      </div>
      <p className="mt-2 text-pequeno">
        La landing muestra los publicados, en este orden. La tarjeta &quot;¿Necesitás otra cosa?&quot; va
        siempre al final.
      </p>

      {servicios.length === 0 ? (
        <p className="contorno mt-8 bg-superficie p-8 text-center">
          Todavía no hay servicios en la base: la landing muestra los del contenido estático.
        </p>
      ) : (
        <ol className="mt-8 flex flex-col gap-3">
          {servicios.map((s, i) => (
            <li key={s.id} className="contorno flex flex-wrap items-center gap-4 bg-papel p-4">
              <div className="grid w-28 shrink-0 place-items-center bg-superficie py-2 [&_svg]:h-14 [&_img]:h-14">
                <IlustracionServicio icono={s.icono} imagen={s.imagen} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{s.titulo}</span>
                  <span
                    className={`contorno px-2 text-pequeno font-bold ${s.publicado ? "bg-primario" : "bg-superficie"}`}
                  >
                    {s.publicado ? "Publicado" : "Borrador"}
                  </span>
                </p>
                <p className="mt-1 text-pequeno break-words">{s.descripcion}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={moverServicioAccion.bind(null, s.id, "subir")}>
                  <button type="submit" className={boton} disabled={i === 0} aria-label={`Subir ${s.titulo}`}>
                    Subir
                  </button>
                </form>
                <form action={moverServicioAccion.bind(null, s.id, "bajar")}>
                  <button
                    type="submit"
                    className={boton}
                    disabled={i === servicios.length - 1}
                    aria-label={`Bajar ${s.titulo}`}
                  >
                    Bajar
                  </button>
                </form>
                <form action={publicarServicioAccion.bind(null, s.id, !s.publicado)}>
                  <button type="submit" className={boton}>
                    {s.publicado ? "Despublicar" : "Publicar"}
                  </button>
                </form>
                <Link href={rutaEdicion(s.id)} className={boton}>
                  Editar
                </Link>
                <BotonBorrar accion={borrarServicioAccion.bind(null, s.id)} titulo={s.titulo} className={boton} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
