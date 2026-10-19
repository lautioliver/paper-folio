"use client";

import { createContext, useActionState, useContext, useEffect, useState, type ReactNode } from "react";
import { borrarServicioAccion, publicarServicioAccion, moverServicioAccion } from "./acciones";
import { SIN_ERROR, type EstadoAccion } from "./tipos";

export const BOTON = "apretable contorno bg-papel px-3 py-1 text-pequeno font-bold disabled:opacity-40";

type Despachar = (formData: FormData) => void;
const Contexto = createContext<{
  despachar: Despachar;
  ocupado: boolean;
} | null>(null);

/**
 * Una sola acción para toda la lista: elige la acción del servidor por el campo `accion`. Así hay un solo
 * estado, un solo mensaje y un solo "ocupado" (un doble clic no manda dos veces), y el mensaje no se va con
 * la fila al refrescar. Cada acción exige `admin` en el servidor: ocultar un botón no protege nada.
 */
async function elegir(previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  switch (formData.get("accion")) {
    case "publicar":
      return publicarServicioAccion(previo, formData);
    case "mover":
      return moverServicioAccion(previo, formData);
    case "borrar":
      return borrarServicioAccion(previo, formData);
    default:
      return { error: "Acción desconocida." };
  }
}

/** Envuelve la lista: muestra el aviso de la última acción y deja a los controles de cada fila usarla. */
export function AccionesServicios({ children }: { children: ReactNode }) {
  const [estado, despachar, ocupado] = useActionState(elegir, SIN_ERROR);
  // Con `cacheComponents`, `<Activity>` conserva el estado de la ruta oculta. Al ocultarse se corre la limpieza
  // del efecto, que descarta el aviso: al volver a la lista no se ve el de una acción vieja.
  const [descartado, setDescartado] = useState<EstadoAccion | null>(null);
  useEffect(() => () => setDescartado(estado), [estado]);
  const aviso = estado === descartado ? null : estado.error;
  return (
    <Contexto.Provider value={{ despachar, ocupado }}>
      {/* Siempre en el DOM: un aria-live que aparece junto con el texto no se anuncia en todos los lectores. */}
      <p aria-live="polite" className="mt-4 min-h-5 text-pequeno font-bold text-tinta">
        {aviso}
      </p>
      {children}
    </Contexto.Provider>
  );
}

function useAcciones() {
  const c = useContext(Contexto);
  if (!c) throw new Error("Los controles van dentro de <AccionesServicios>.");
  return c;
}

function Campos({ accion, id, extra }: { accion: string; id: string; extra?: Record<string, string> }) {
  return (
    <>
      <input type="hidden" name="accion" value={accion} />
      <input type="hidden" name="id" value={id} />
      {Object.entries(extra ?? {}).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
    </>
  );
}

/** Mover, publicar o despublicar y borrar una fila. Mientras corre una acción de la lista, los botones se deshabilitan. */
export function ControlesServicio({
  id,
  titulo,
  publicado,
  primera,
  ultima,
  ordenable = true,
}: {
  id: string;
  titulo: string;
  publicado: boolean;
  primera: boolean;
  ultima: boolean;
  /** Las huérfanas no se ordenan. */
  ordenable?: boolean;
}) {
  const { despachar, ocupado } = useAcciones();
  return (
    <>
      {ordenable && (
        <>
          <form action={despachar}>
            <Campos accion="mover" id={id} extra={{ direccion: "subir" }} />
            <button type="submit" className={BOTON} disabled={primera || ocupado} aria-label={`Subir ${titulo}`}>
              Subir
            </button>
          </form>
          <form action={despachar}>
            <Campos accion="mover" id={id} extra={{ direccion: "bajar" }} />
            <button type="submit" className={BOTON} disabled={ultima || ocupado} aria-label={`Bajar ${titulo}`}>
              Bajar
            </button>
          </form>
        </>
      )}
      <form action={despachar}>
        <Campos accion="publicar" id={id} extra={{ publicado: String(!publicado) }} />
        <button
          type="submit"
          className={BOTON}
          disabled={ocupado}
          aria-label={`${publicado ? "Despublicar" : "Publicar"} ${titulo}`}
        >
          {publicado ? "Despublicar" : "Publicar"}
        </button>
      </form>
    </>
  );
}

/** Borrar pide confirmación: no se puede deshacer. El permiso lo exige la acción en el servidor. */
export function BotonBorrarServicio({ id, titulo }: { id: string; titulo: string }) {
  const { despachar, ocupado } = useAcciones();
  return (
    <form
      action={despachar}
      onSubmit={(e) => {
        if (!window.confirm(`¿Borrar el servicio "${titulo}"? No se puede deshacer.`)) e.preventDefault();
      }}
    >
      <Campos accion="borrar" id={id} />
      <button type="submit" className={BOTON} disabled={ocupado} aria-label={`Borrar ${titulo}`}>
        Borrar
      </button>
    </form>
  );
}
