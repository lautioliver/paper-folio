"use client";

import { useActionState } from "react";
import {
  ETIQUETAS_ESTADO,
  TRANSICIONES,
  type EstadoConsulta,
} from "@/lib/estados-consulta";
import { agregarNotaAccion, cambiarEstadoAccion } from "./acciones";
import { SIN_ERROR } from "./tipos";

const LARGO_MAXIMO_NOTA = 2000; // el mismo de src/lib/seguimiento.ts (el servidor es el que valida)
const campo = "contorno bg-papel px-3 py-2 text-pequeno";
const boton =
  "marca apretable bg-tinta px-5 py-2 text-pequeno font-bold text-papel disabled:opacity-60";

function MensajeError({ id, texto }: { id: string; texto: string | null }) {
  // Siempre en el DOM: un aria-live que aparece junto con el texto no se anuncia en todos los lectores.
  return (
    <p id={id} aria-live="polite" className="min-h-5 text-pequeno font-bold text-tinta">
      {texto}
    </p>
  );
}

/**
 * Controles del detalle: cambiar el estado (solo a los permitidos desde el actual) y agregar una nota.
 * Ocultar estados no protege nada: la transición la valida `cambiarEstado` en el servidor.
 */
export function ControlesConsulta({
  id,
  estado,
}: {
  id: string;
  estado: EstadoConsulta;
}) {
  const [estadoCambio, cambiar, cambiando] = useActionState(
    cambiarEstadoAccion.bind(null, id),
    SIN_ERROR,
  );
  const [estadoNota, anotar, anotando] = useActionState(
    agregarNotaAccion.bind(null, id),
    SIN_ERROR,
  );
  const siguientes = TRANSICIONES[estado] ?? [];

  return (
    <div className="grid gap-8">
      <form action={cambiar} className="grid gap-2">
        <h2 className="text-h3 font-bold">Estado</h2>
        {siguientes.length === 0 ? (
          <p className="text-pequeno">No se puede cambiar a mano desde este estado.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-pequeno font-bold">
              Pasar a
              <select
                name="estado"
                defaultValue={siguientes[0]}
                className={campo}
                aria-describedby="error-estado"
              >
                {siguientes.map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETAS_ESTADO[e]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={cambiando} className={boton}>
              {cambiando ? "Cambiando…" : "Cambiar estado"}
            </button>
          </div>
        )}
        <MensajeError id="error-estado" texto={estadoCambio.error} />
      </form>

      <form action={anotar} className="grid gap-2">
        <h2 className="text-h3 font-bold">Agregar una nota</h2>
        <label htmlFor="nota" className="text-pequeno font-bold">
          Nota interna (no la ve el visitante)
        </label>
        <textarea
          id="nota"
          name="texto"
          required
          maxLength={LARGO_MAXIMO_NOTA}
          rows={4}
          className={`${campo} w-full`}
          aria-describedby="error-nota"
        />
        <div>
          <button type="submit" disabled={anotando} className={boton}>
            {anotando ? "Guardando…" : "Guardar nota"}
          </button>
        </div>
        <MensajeError id="error-nota" texto={estadoNota.error} />
      </form>
    </div>
  );
}
