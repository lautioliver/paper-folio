"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ServiceIcon } from "@/components/sitio/Illustrations";
import { SERVICE_ICONS, type ServiceIcon as NombreIcono } from "@/content/profile";
import { LARGO_DESCRIPCION, LARGO_TITULO, type CampoServicio } from "@/lib/servicios-campos";
import { guardarServicioAccion } from "./acciones";
import { RUTA_SERVICIOS } from "./rutas";
import { subirImagenDelPanel } from "./subida";
import { FORMULARIO_INICIAL, type ValoresFormulario } from "./tipos";

const ETIQUETAS_ICONO: Record<NombreIcono, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Base de datos",
  integrations: "Integraciones",
  deploy: "Deploy",
};

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
 * Alta y edición de un servicio. La validación real (largos, ícono, URL https, título único) la hace el
 * servidor; los `maxLength` son solo ayuda. La imagen se sube antes con `POST /api/imagenes` y el
 * formulario manda su URL.
 */
export function FormularioServicio({ id, inicial }: { id: string | null; inicial: ValoresFormulario }) {
  const [estado, guardar, guardando] = useActionState(guardarServicioAccion.bind(null, id), FORMULARIO_INICIAL);
  // React resetea el formulario después de la acción: si falló, vuelve lo que se mandó.
  const valores = estado.valores ?? inicial;
  const [ilustracion, setIlustracion] = useState(inicial.ilustracion);
  // Controlados: cambiar entre ícono e imagen desmonta los controles del otro y no se pierde la elección.
  const [icono, setIcono] = useState(inicial.icono);
  const [imagen, setImagen] = useState(inicial.imagen);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const error = (c: CampoServicio) => estado.campos[c];

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setSubiendo(true);
    setErrorSubida(null);
    const r = await subirImagenDelPanel(archivo);
    setSubiendo(false);
    if (r.ok) setImagen(r.url);
    else setErrorSubida(r.mensaje);
  }

  return (
    <form action={guardar} className="mt-6 grid max-w-2xl gap-4">
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
          aria-invalid={error("titulo") ? true : undefined}
          aria-describedby="error-titulo"
        />
        <MensajeCampo id="error-titulo" texto={error("titulo")} />
      </div>

      <div className="grid gap-1">
        <label htmlFor="descripcion" className="text-pequeno font-bold">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          required
          rows={3}
          maxLength={LARGO_DESCRIPCION}
          defaultValue={valores.descripcion}
          className={campo}
          aria-invalid={error("descripcion") ? true : undefined}
          aria-describedby="error-descripcion"
        />
        <MensajeCampo id="error-descripcion" texto={error("descripcion")} />
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-pequeno font-bold">Ilustración</legend>
        <div className="flex flex-wrap gap-4 text-pequeno">
          {(["icono", "imagen"] as const).map((tipo) => (
            <label key={tipo} className="flex items-center gap-2">
              <input
                type="radio"
                name="ilustracion"
                value={tipo}
                checked={ilustracion === tipo}
                onChange={() => setIlustracion(tipo)}
              />
              {tipo === "icono" ? "Un ícono" : "Una imagen"}
            </label>
          ))}
        </div>

        {ilustracion === "icono" ? (
          <div role="radiogroup" aria-label="Ícono" aria-describedby="error-icono" className="flex flex-wrap gap-3">
            {SERVICE_ICONS.map((nombre) => (
              <label
                key={nombre}
                className="contorno flex cursor-pointer flex-col items-center gap-1 bg-superficie p-2 text-pequeno has-checked:bg-primario [&_svg]:h-12"
              >
                <input
                  type="radio"
                  name="icono"
                  value={nombre}
                  checked={icono === nombre}
                  onChange={() => setIcono(nombre)}
                  className="sr-only"
                />
                <ServiceIcon icon={nombre} />
                {ETIQUETAS_ICONO[nombre]}
              </label>
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            <input type="hidden" name="imagen" value={imagen} />
            {imagen && (
              // URL https de Vercel Blob (la valida el servidor al guardar).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagen} alt="Imagen elegida" className="contorno h-24 w-auto bg-superficie object-contain" />
            )}
            <label className="text-pequeno font-bold">
              {imagen ? "Cambiar la imagen" : "Subir una imagen"} (PNG, JPEG o WebP, hasta 2 MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={alElegirArchivo}
                disabled={subiendo}
                className="mt-1 block text-pequeno"
                aria-describedby="error-imagen"
              />
            </label>
            {subiendo && <p className="text-pequeno">Subiendo…</p>}
            <MensajeCampo id="error-imagen" texto={errorSubida ?? error("imagen")} />
          </div>
        )}
        {ilustracion === "icono" && <MensajeCampo id="error-icono" texto={error("icono")} />}
      </fieldset>

      <label className="flex items-center gap-2 text-pequeno font-bold">
        <input type="checkbox" name="publicado" defaultChecked={valores.publicado} />
        Publicado (se ve en la landing)
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={guardando || subiendo} className={boton}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <Link href={RUTA_SERVICIOS} className="text-pequeno font-bold underline">
          Cancelar
        </Link>
      </div>
      <MensajeCampo id="error-formulario" texto={estado.error ?? undefined} />
    </form>
  );
}
