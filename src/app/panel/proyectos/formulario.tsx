"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { TONES } from "@/components/sitio/tones";
import { LIMITES, sugerirSlug, type ValoresFormulario } from "@/lib/proyecto-entrada";
import { actualizarProyectoAccion, crearProyectoAccion } from "./acciones";
import { RUTA_PROYECTOS_PANEL } from "./ruta";
import { FORMULARIO_INICIAL } from "./tipos";

const campo = "contorno w-full bg-papel px-3 py-2 text-pequeno";
const etiqueta = "flex flex-col gap-1 text-pequeno font-bold";
const boton = "marca apretable bg-tinta px-5 py-2 text-pequeno font-bold text-papel disabled:opacity-60";

const NOMBRES_ACENTO: Record<(typeof TONES)[number], string> = {
  primario: "Amarillo (primario)",
  acento: "Coral (acento)",
  secundario: "Azul (secundario)",
  terciario: "Índigo (terciario)",
};

type Errores = Record<string, string>;

function ErrorCampo({ nombre, errores }: { nombre: string; errores: Errores }) {
  if (!errores[nombre]) return null;
  return (
    <span id={`error-${nombre}`} className="font-normal text-tinta">
      {errores[nombre]}
    </span>
  );
}

/** Props de accesibilidad de un campo con su error. */
function aria(nombre: string, errores: Errores) {
  return errores[nombre] ? { "aria-invalid": true, "aria-describedby": `error-${nombre}` } : {};
}

function Campo({
  nombre,
  titulo,
  ayuda,
  errores,
  children,
}: {
  nombre: string;
  titulo: string;
  ayuda?: string;
  errores: Errores;
  children: ReactNode;
}) {
  return (
    <label className={etiqueta}>
      {titulo}
      {ayuda && <span className="font-normal">{ayuda}</span>}
      {children}
      <ErrorCampo nombre={nombre} errores={errores} />
    </label>
  );
}

/**
 * Imagen opcional: se sube a `/api/imagenes` (solo admin; valida la firma, el tamaño y las dimensiones) y la
 * URL que devuelve va en el campo oculto `imagen`. El archivo no viaja con el formulario (el input no tiene
 * `name`): las server actions tienen un límite de 1 MB.
 */
function CampoImagen({
  inicial,
  errores,
  alSubir,
}: {
  inicial: string;
  errores: Errores;
  /** Avisa si hay una subida en curso: mientras tanto no se puede guardar (se guardaría la imagen anterior). */
  alSubir: (subiendo: boolean) => void;
}) {
  const [url, setUrl] = useState(inicial);
  const [subiendo, setSubiendoLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSubiendo(valor: boolean) {
    setSubiendoLocal(valor);
    alSubir(valor);
  }

  async function subir(archivo: File | undefined) {
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      const datos = new FormData();
      datos.set("archivo", archivo);
      const respuesta = await fetch("/api/imagenes", { method: "POST", body: datos });
      const cuerpo: unknown = await respuesta.json().catch(() => null);
      const subida = cuerpo as { url?: unknown; error?: { mensaje?: unknown } } | null;
      if (respuesta.ok && typeof subida?.url === "string") setUrl(subida.url);
      else setError(typeof subida?.error?.mensaje === "string" ? subida.error.mensaje : "No pudimos subir la imagen.");
    } catch {
      setError("No pudimos subir la imagen. Revisá la conexión y probá de nuevo.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="text-pequeno font-bold">Imagen (opcional)</legend>
      <input type="hidden" name="imagen" value={url} />
      {url && (
        // URL https validada en el servidor; next/image pediría configurar `remotePatterns`.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Vista previa de la imagen del proyecto" className="contorno h-32 w-auto object-contain" />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className={etiqueta}>
          {url ? "Cambiar la imagen" : "Subir una imagen"}
          <span className="font-normal">PNG, JPEG o WebP, hasta 2 MB y 2000 × 2000 px.</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={subiendo}
            onChange={(e) => subir(e.target.files?.[0])}
            className="text-pequeno"
            {...aria("imagen", errores)}
          />
        </label>
        {url && (
          <button type="button" onClick={() => setUrl("")} className="text-pequeno font-bold underline">
            Quitar la imagen
          </button>
        )}
      </div>
      <p aria-live="polite" className="min-h-5 text-pequeno font-bold text-tinta">
        {subiendo ? "Subiendo la imagen…" : (error ?? errores.imagen ?? "")}
      </p>
    </fieldset>
  );
}

function Campos({
  valores,
  errores,
  nuevo,
  alSubir,
}: {
  valores: ValoresFormulario;
  errores: Errores;
  nuevo: boolean;
  alSubir: (subiendo: boolean) => void;
}) {
  const [nombre, setNombre] = useState(valores.nombre);
  const [slug, setSlug] = useState(valores.slug);
  // En uno nuevo, el slug se sugiere desde el nombre hasta que se lo edita a mano.
  const [slugAMano, setSlugAMano] = useState(!nuevo || valores.slug !== "");

  return (
    <div className="grid gap-5">
      <Campo nombre="nombre" titulo="Nombre" errores={errores}>
        <input
          name="nombre"
          required
          maxLength={LIMITES.nombre}
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            if (!slugAMano) setSlug(sugerirSlug(e.target.value));
          }}
          className={campo}
          {...aria("nombre", errores)}
        />
      </Campo>
      <Campo
        nombre="slug"
        titulo="Slug"
        ayuda={
          nuevo
            ? "La dirección del proyecto: minúsculas, números y guiones."
            : "La dirección del proyecto. Si lo cambiás, los enlaces viejos dejan de andar."
        }
        errores={errores}
      >
        <input
          name="slug"
          required
          maxLength={LIMITES.slug}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugAMano(true);
          }}
          className={campo}
          {...aria("slug", errores)}
        />
      </Campo>
      <div className="grid gap-5 sm:grid-cols-3">
        <Campo nombre="inicial" titulo="Inicial" ayuda="Una o dos letras." errores={errores}>
          <input
            name="inicial"
            required
            maxLength={2}
            defaultValue={valores.inicial}
            className={campo}
            {...aria("inicial", errores)}
          />
        </Campo>
        <Campo nombre="categoria" titulo="Categoría" errores={errores}>
          <input
            name="categoria"
            required
            maxLength={LIMITES.categoria}
            defaultValue={valores.categoria}
            className={campo}
            {...aria("categoria", errores)}
          />
        </Campo>
        <Campo nombre="acento" titulo="Color" errores={errores}>
          <select name="acento" defaultValue={valores.acento} className={campo} {...aria("acento", errores)}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {NOMBRES_ACENTO[t]}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo nombre="descripcion" titulo="Descripción" ayuda={`Hasta ${LIMITES.descripcion} caracteres.`} errores={errores}>
        <textarea
          name="descripcion"
          required
          rows={3}
          maxLength={LIMITES.descripcion}
          defaultValue={valores.descripcion}
          className={campo}
          {...aria("descripcion", errores)}
        />
      </Campo>
      <Campo
        nombre="stack"
        titulo="Stack"
        ayuda={`Una tecnología por línea, de ${LIMITES.stackMin} a ${LIMITES.stackMax}.`}
        errores={errores}
      >
        <textarea name="stack" required rows={4} defaultValue={valores.stack} className={campo} {...aria("stack", errores)} />
      </Campo>
      <Campo nombre="repoUrl" titulo="Repositorio" ayuda="URL https." errores={errores}>
        <input
          name="repoUrl"
          type="url"
          required
          defaultValue={valores.repoUrl}
          className={campo}
          {...aria("repoUrl", errores)}
        />
      </Campo>
      <CampoImagen inicial={valores.imagen} errores={errores} alSubir={alSubir} />

      <fieldset className="grid gap-5">
        <legend className="text-h3 font-bold">Caso de estudio</legend>
        <Campo nombre="caso.problema" titulo="Problema" ayuda={`Hasta ${LIMITES.caso} caracteres.`} errores={errores}>
          <textarea
            name="caso.problema"
            required
            rows={5}
            maxLength={LIMITES.caso}
            defaultValue={valores["caso.problema"]}
            className={campo}
            {...aria("caso.problema", errores)}
          />
        </Campo>
        <Campo nombre="caso.solucion" titulo="Solución" ayuda={`Hasta ${LIMITES.caso} caracteres.`} errores={errores}>
          <textarea
            name="caso.solucion"
            required
            rows={5}
            maxLength={LIMITES.caso}
            defaultValue={valores["caso.solucion"]}
            className={campo}
            {...aria("caso.solucion", errores)}
          />
        </Campo>
        <Campo
          nombre="caso.funcionalidades"
          titulo="Funcionalidades"
          ayuda="Una por línea (opcional)."
          errores={errores}
        >
          <textarea
            name="caso.funcionalidades"
            rows={5}
            defaultValue={valores["caso.funcionalidades"]}
            className={campo}
            {...aria("caso.funcionalidades", errores)}
          />
        </Campo>
        <Campo nombre="caso.stack" titulo="Stack del caso" ayuda="Una tecnología por línea (opcional)." errores={errores}>
          <textarea
            name="caso.stack"
            rows={3}
            defaultValue={valores["caso.stack"]}
            className={campo}
            {...aria("caso.stack", errores)}
          />
        </Campo>
      </fieldset>

      <label className="flex items-center gap-2 text-pequeno font-bold">
        <input type="checkbox" name="publicado" defaultChecked={valores.publicado} className="size-5" />
        Publicado (se ve en el sitio)
      </label>
    </div>
  );
}

/**
 * Formulario de un proyecto: crear (sin `id`) o editar. La validación que vale es la del servidor (Zod en el
 * servicio); los `required` y `maxLength` de acá solo ahorran un viaje. Si falla, vuelve lo que se mandó.
 */
// La `key` es la versión del documento (`versionDe`, src/lib/version-formulario.ts): Next guarda en
// <Activity> el DOM y el estado de las rutas visitadas, y sin esto, al volver a editar se veía lo de antes
// del último guardado (y "Guardar" lo revertía). Si no se escribió, lo escrito se conserva.
export function FormularioProyecto(props: { id?: string; valores: ValoresFormulario; version: string }) {
  return <FormularioConEstado key={props.version} id={props.id} valores={props.valores} />;
}

function FormularioConEstado({ id, valores }: { id?: string; valores: ValoresFormulario }) {
  const accion = id ? actualizarProyectoAccion.bind(null, id) : crearProyectoAccion;
  const [estado, enviar, enviando] = useActionState(accion, FORMULARIO_INICIAL);
  const [subiendo, setSubiendo] = useState(false);

  return (
    <form action={enviar} className="mt-6 grid max-w-2xl gap-6">
      {/* Un intento fallido remonta los campos con lo que se mandó (React resetea el formulario). */}
      <Campos
        key={estado.intento}
        valores={estado.valores ?? valores}
        errores={estado.campos}
        nuevo={!id}
        alSubir={setSubiendo}
      />
      <p aria-live="polite" className="min-h-5 text-pequeno font-bold text-tinta">
        {estado.error}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={enviando || subiendo} className={boton}>
          {enviando ? "Guardando…" : subiendo ? "Esperando la imagen…" : id ? "Guardar cambios" : "Crear proyecto"}
        </button>
        <Link href={RUTA_PROYECTOS_PANEL} className="text-pequeno font-bold underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
