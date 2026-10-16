"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ProyectoDeDemo } from "@/lib/demos-admin";
import { LARGO_DESCRIPCION, LARGO_TITULO, type CampoDemo } from "@/lib/demos-campos";
import { guardarDemoAccion } from "./acciones";
import { RUTA_DEMOS } from "./rutas";
import { claveDelFormulario, FORMULARIO_INICIAL, valoresAMostrar, type ValoresFormulario } from "./tipos";

const campo = "contorno w-full bg-papel px-3 py-2 text-pequeno";
const boton = "marca apretable bg-tinta px-5 py-2 text-pequeno font-bold text-papel disabled:opacity-60";

function MensajeCampo({ id, texto }: { id: string; texto?: string }) {
  // Siempre en el DOM: un aria-live que aparece junto con el texto no se anuncia en todos los lectores.
  return (
    <p id={id} aria-live="polite" className="min-h-5 text-pequeno font-bold text-tinta">
      {texto}
    </p>
  );
}

/**
 * Alta y edición de una demo. La validación real (proyecto existente, URL https, largos) la hace el
 * servidor; los `maxLength` y el `type="url"` son solo ayuda.
 *
 * Si el servidor rechaza el guardado, la acción devuelve lo que se mandó y un envío más: los campos se
 * vuelven a montar (`key`) con esos valores por defecto, así el reset de React no borra nada.
 */
export function FormularioDemo({
  id,
  inicial,
  proyectos,
}: {
  id: string | null;
  inicial: ValoresFormulario;
  proyectos: ProyectoDeDemo[];
}) {
  const [estado, guardar, guardando] = useActionState(guardarDemoAccion.bind(null, id), FORMULARIO_INICIAL);
  return (
    <form action={guardar} className="mt-6 grid max-w-2xl gap-4">
      <CamposDemo
        key={claveDelFormulario(estado)}
        valores={valoresAMostrar(estado, inicial)}
        campos={estado.campos}
        proyectos={proyectos}
        guardando={guardando}
      />
      <MensajeCampo id="error-formulario" texto={estado.error ?? undefined} />
    </form>
  );
}

// Todos los controles son no controlados (valores por defecto): el reset del formulario los deja en `valores`.
function CamposDemo({
  valores,
  campos,
  proyectos,
  guardando,
}: {
  valores: ValoresFormulario;
  campos: Partial<Record<CampoDemo, string>>;
  proyectos: ProyectoDeDemo[];
  guardando: boolean;
}) {
  return (
    <>
      <div className="grid gap-1">
        <label htmlFor="proyecto" className="text-pequeno font-bold">
          Proyecto
        </label>
        <select
          id="proyecto"
          name="proyecto"
          required
          defaultValue={valores.proyecto}
          className={campo}
          aria-invalid={campos.proyecto ? true : undefined}
          aria-describedby="error-proyecto"
        >
          <option value="" disabled>
            Elegí un proyecto
          </option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <MensajeCampo id="error-proyecto" texto={campos.proyecto} />
      </div>

      <div className="grid gap-1">
        <label htmlFor="titulo" className="text-pequeno font-bold">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          maxLength={LARGO_TITULO}
          defaultValue={valores.titulo}
          className={campo}
          aria-invalid={campos.titulo ? true : undefined}
          aria-describedby="error-titulo"
        />
        <MensajeCampo id="error-titulo" texto={campos.titulo} />
      </div>

      <div className="grid gap-1">
        <label htmlFor="url" className="text-pequeno font-bold">
          URL (https)
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://"
          defaultValue={valores.url}
          className={campo}
          aria-invalid={campos.url ? true : undefined}
          aria-describedby="error-url"
        />
        <MensajeCampo id="error-url" texto={campos.url} />
      </div>

      <div className="grid gap-1">
        <label htmlFor="descripcion" className="text-pequeno font-bold">
          Descripción (opcional)
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={3}
          maxLength={LARGO_DESCRIPCION}
          defaultValue={valores.descripcion}
          className={campo}
          aria-invalid={campos.descripcion ? true : undefined}
          aria-describedby="error-descripcion"
        />
        <MensajeCampo id="error-descripcion" texto={campos.descripcion} />
      </div>

      <label className="flex items-center gap-2 text-pequeno font-bold">
        <input type="checkbox" name="activa" defaultChecked={valores.activa} />
        Activa (se ve en el detalle del proyecto)
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={guardando} className={boton}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <Link href={RUTA_DEMOS} className="text-pequeno font-bold underline">
          Cancelar
        </Link>
      </div>
    </>
  );
}
