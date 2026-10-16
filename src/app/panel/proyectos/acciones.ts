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
  if (!r.ok) return { error: r.mensaje };
  updateTag(TAG_CONTENIDO);
  refresh();
  return { error: null };
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

// `previo` es el estado anterior de `useActionState`; estas acciones no lo usan.

export async function borrarProyectoAccion(id: string, previo: EstadoAccion): Promise<EstadoAccion> {
  void previo;
  await requerirRol(RUTA_PROYECTOS_PANEL, "admin");
  return lista(await borrarProyecto(id));
}

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
