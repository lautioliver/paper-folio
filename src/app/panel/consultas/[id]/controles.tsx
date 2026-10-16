"use client";

import { useActionState } from "react";
import {
  ESTADOS_PARA_RESPONDER,
  ETIQUETAS_ESTADO,
  LARGO_MAXIMO_NOTA,
  LARGO_MAXIMO_RESPUESTA,
  TRANSICIONES,
  type EstadoConsulta,
} from "@/lib/estados-consulta";
import { agregarNotaAccion, cambiarEstadoAccion, responderAccion } from "./acciones";
import { SIN_ERROR } from "./tipos";

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
 * Controles del detalle: cambiar el estado (solo a los permitidos desde el actual), responder por email (solo
 * en curso) y agregar una nota. Ocultar controles no protege nada: lo valida el servidor (`cambiarEstado`,
 * `responderConsulta`). `email` es solo para mostrar a quién va: el destino lo toma el servidor de la consulta.
 */
export function ControlesConsulta({
  id,
  estado,
  email,
}: {
  id: string;
  estado: EstadoConsulta;
  email: string;
}) {
  const [estadoCambio, cambiar, cambiando] = useActionState(
    cambiarEstadoAccion.bind(null, id),
    SIN_ERROR,
  );
  const [estadoNota, anotar, anotando] = useActionState(
    agregarNotaAccion.bind(null, id),
    SIN_ERROR,
  );
  const [estadoRespuesta, responder, respondiendo] = useActionState(
    responderAccion.bind(null, id),
    SIN_ERROR,
  );
  const siguientes = TRANSICIONES[estado] ?? [];
  const sePuedeResponder = ESTADOS_PARA_RESPONDER.includes(estado);

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

      <section aria-labelledby="titulo-responder" className="grid gap-2">
        <h2 id="titulo-responder" className="text-h3 font-bold">
          Responder por email
        </h2>
        {sePuedeResponder ? (
          <form
            action={responder}
            onSubmit={(e) => {
              if (!window.confirm(`¿Enviar la respuesta por email a ${email}? No se puede deshacer.`)) {
                e.preventDefault();
              }
            }}
            className="grid gap-2"
          >
            <label htmlFor="respuesta" className="text-pequeno font-bold">
              Respuesta para {email} (texto plano; debajo va citado su mensaje)
            </label>
            <textarea
              id="respuesta"
              name="texto"
              required
              minLength={1}
              maxLength={LARGO_MAXIMO_RESPUESTA}
              // Si el envío falló, la respuesta vuelve en `texto` para reintentar.
              defaultValue={estadoRespuesta.texto ?? ""}
              rows={8}
              className={`${campo} w-full`}
              aria-describedby="error-respuesta"
            />
            <div>
              <button type="submit" disabled={respondiendo} className={boton}>
                {respondiendo ? "Enviando…" : "Enviar respuesta"}
              </button>
            </div>
            <MensajeError id="error-respuesta" texto={estadoRespuesta.error} />
          </form>
        ) : (
          <>
            <p className="text-pequeno">Para responder por email, pasá la consulta a En curso.</p>
            <MensajeError id="error-respuesta" texto={estadoRespuesta.error} />
          </>
        )}
      </section>

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
          // React resetea el formulario al terminar la acción: si falló, la nota vuelve en `texto`.
          defaultValue={estadoNota.texto ?? ""}
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
