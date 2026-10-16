"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import type { ProyectoEnLista } from "@/lib/proyectos-admin";
import { borrarProyectoAccion, publicarProyectoAccion, reordenarProyectosAccion } from "./acciones";
import { rutaEditarProyecto } from "./ruta";
import { SIN_ERROR } from "./tipos";

const boton = "apretable contorno bg-papel px-3 py-1 text-pequeno font-bold disabled:opacity-60";

function Mensaje({ texto }: { texto: string | null }) {
  // Siempre en el DOM: un aria-live que aparece junto con el texto no se anuncia en todos los lectores.
  return (
    <p aria-live="polite" className="min-h-5 text-pequeno font-bold text-tinta">
      {texto}
    </p>
  );
}

/** Los ids con el de `i` cambiado de lugar con el de `j`. */
function intercambiar(ids: string[], i: number, j: number): string[] {
  const copia = [...ids];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

/** Botón que manda el orden nuevo completo: el servidor lo rechaza si la lista cambió en el medio. */
function Mover({
  orden,
  accion,
  ocupado,
  etiqueta,
  children,
}: {
  orden: string[];
  accion: (formData: FormData) => void;
  ocupado: boolean;
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <form action={accion}>
      {orden.map((id) => (
        <input key={id} type="hidden" name="orden" value={id} />
      ))}
      <button type="submit" disabled={ocupado} className={boton} aria-label={etiqueta}>
        {children}
      </button>
    </form>
  );
}

/**
 * Lista del panel con los controles de cada proyecto. Ocultar un botón no protege nada: cada acción exige
 * `admin` en el servidor.
 */
export function ListaProyectos({ proyectos }: { proyectos: ProyectoEnLista[] }) {
  const [estadoOrden, ordenar, ordenando] = useActionState(reordenarProyectosAccion, SIN_ERROR);
  const ids = proyectos.map((p) => p.id);

  return (
    <>
      <Mensaje texto={estadoOrden.error} />
      <ol className="mt-2 flex flex-col gap-3">
        {proyectos.map((p, i) => (
          <li key={p.id} className="contorno bg-papel p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-pequeno font-bold">{i + 1}.</span>
              <Link href={rutaEditarProyecto(p.id)} className="font-bold underline decoration-2 underline-offset-4">
                {p.nombre}
              </Link>
              <span className="text-pequeno">{p.publicado ? "Publicado" : "Sin publicar"}</span>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                {i > 0 && (
                  <Mover orden={intercambiar(ids, i, i - 1)} accion={ordenar} ocupado={ordenando} etiqueta={`Subir ${p.nombre}`}>
                    Subir
                  </Mover>
                )}
                {i < proyectos.length - 1 && (
                  <Mover orden={intercambiar(ids, i, i + 1)} accion={ordenar} ocupado={ordenando} etiqueta={`Bajar ${p.nombre}`}>
                    Bajar
                  </Mover>
                )}
              </div>
            </div>
            <ControlesFila proyecto={p} ultimo={proyectos.length === 1} />
          </li>
        ))}
      </ol>
    </>
  );
}

function ControlesFila({ proyecto, ultimo }: { proyecto: ProyectoEnLista; ultimo: boolean }) {
  const [estadoPublicar, publicar, publicando] = useActionState(
    publicarProyectoAccion.bind(null, proyecto.id, !proyecto.publicado),
    SIN_ERROR,
  );
  const [estadoBorrar, borrar, borrando] = useActionState(borrarProyectoAccion.bind(null, proyecto.id), SIN_ERROR);
  const [confirmando, setConfirmando] = useState(false);
  const demos =
    proyecto.demos === 0 ? "" : proyecto.demos === 1 ? " y su demo" : ` y sus ${proyecto.demos} demos`;

  return (
    <div className="mt-3 grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form action={publicar}>
          <button type="submit" disabled={publicando} className={boton}>
            {proyecto.publicado ? "Despublicar" : "Publicar"}
          </button>
        </form>
        <Link href={rutaEditarProyecto(proyecto.id)} className={boton}>
          Editar
        </Link>
        {!confirmando ? (
          <button type="button" className={boton} onClick={() => setConfirmando(true)}>
            Borrar
          </button>
        ) : (
          <form action={borrar} className="flex flex-wrap items-center gap-2">
            <span className="text-pequeno font-bold">
              ¿Borrar «{proyecto.nombre}»{demos}? No se puede deshacer.
              {/* ADR-003: con la colección vacía, el sitio vuelve al contenido estático. */}
              {ultimo && " Es el último: sin proyectos en la base, el sitio vuelve a mostrar los del contenido estático."}
            </span>
            <button type="submit" disabled={borrando} className={`${boton} bg-tinta text-papel`}>
              {borrando ? "Borrando…" : "Sí, borrar"}
            </button>
            <button type="button" className={boton} onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </form>
        )}
      </div>
      <Mensaje texto={estadoPublicar.error ?? estadoBorrar.error} />
    </div>
  );
}
