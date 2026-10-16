"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG_CONTENIDO } from "@/lib/contenido";
import { requerirRol } from "@/lib/permisos";
import { datosDeFormulario, valoresDeFormulario } from "@/lib/proyecto-entrada";
import {
  actualizarProyecto,
  borrarProyecto,
  crearProyecto,
  publicarProyecto,
  reordenar,
  type ResultadoProyecto,
} from "@/lib/proyectos-admin";
import { RUTA_NUEVO_PROYECTO, RUTA_PROYECTOS_PANEL, rutaEditarProyecto } from "./ruta";
import type { EstadoAccion, EstadoFormulario } from "./tipos";

// Cada acción se puede llamar directo (un POST armado a mano, con cualquier `id`): el rol se exige acá, antes
// de tocar la base (el layout del panel no protege, ADR-002 R-3). Los datos los valida el servicio con Zod.
// Si se escribió, se invalida el contenido del sitio (ADR-003): la landing, /proyectos y el detalle lo
// muestran en el próximo pedido, sin redeploy.

function formulario(previo: EstadoFormulario, formData: FormData, r: ResultadoProyecto): EstadoFormulario {
  if (r.ok) {
    updateTag(TAG_CONTENIDO);
    redirect(RUTA_PROYECTOS_PANEL);
  }
  return { error: r.mensaje, campos: r.campos ?? {}, valores: valoresDeFormulario(formData), intento: previo.intento + 1 };
}

function lista(r: ResultadoProyecto): EstadoAccion {
  if (r.ok) updateTag(TAG_CONTENIDO);
  // Un proyecto que ya no existe o una lista que cambió es una pantalla vieja (otro admin la tocó en el medio):
  // se refresca igual, así se ve la lista real junto con el mensaje.
  if (r.ok || r.error === "no-encontrado" || r.error === "desactualizada") refresh();
  return { error: r.ok ? (r.aviso ?? null) : r.mensaje };
}

export async function crearProyectoAccion(previo: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await requerirRol(RUTA_NUEVO_PROYECTO, "admin");
  return formulario(previo, formData, await crearProyecto(datosDeFormulario(formData)));
}

export async function actualizarProyectoAccion(
  id: string,
  previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirRol(rutaEditarProyecto(id), "admin");
  return formulario(previo, formData, await actualizarProyecto(id, datosDeFormulario(formData)));
}

/**
 * `id`: el proyecto a borrar (campo oculto). La acción es una sola para toda la lista, no una por fila: si
 * no, el mensaje (por ejemplo, el aviso de un borrado a medias) se iría con la fila borrada al refrescar.
 */
export async function borrarProyectoAccion(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirRol(RUTA_PROYECTOS_PANEL, "admin");
  const id = formData.get("id");
  let r: ResultadoProyecto;
  try {
    r = await borrarProyecto(typeof id === "string" ? id : "");
  } catch (error) {
    // No se sabe si el proyecto llegó a borrarse (la respuesta de la base se pudo perder): se invalida igual,
    // así el sitio nunca sigue mostrando un proyecto borrado. Invalidar de más solo cuesta una lectura.
    updateTag(TAG_CONTENIDO);
    throw error;
  }
  return lista(r);
}

// `previo` es el estado anterior de `useActionState`; esta acción no lo usa.
export async function publicarProyectoAccion(
  id: string,
  publicado: boolean,
  previo: EstadoAccion,
): Promise<EstadoAccion> {
  void previo;
  await requerirRol(RUTA_PROYECTOS_PANEL, "admin");
  return lista(await publicarProyecto(id, publicado === true));
}

/** `orden`: los ids de todos los proyectos, en el orden nuevo (campos ocultos del formulario). */
export async function reordenarProyectosAccion(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirRol(RUTA_PROYECTOS_PANEL, "admin");
  const ids = formData.getAll("orden").filter((v): v is string => typeof v === "string");
  return lista(await reordenar(ids));
}
