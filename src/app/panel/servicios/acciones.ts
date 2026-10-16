"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG_CONTENIDO } from "@/lib/contenido";
import { requerirRol } from "@/lib/permisos";
import {
  borrarServicio,
  crearServicio,
  editarServicio,
  moverServicio,
  publicarServicio,
  type ResultadoServicio,
} from "@/lib/servicios-admin";
import { RUTA_NUEVO_SERVICIO, RUTA_SERVICIOS, rutaEdicion } from "./rutas";
import type { EstadoFormulario, ValoresFormulario } from "./tipos";

// Cada acción se puede llamar directo (un POST armado a mano, con cualquier id o valor): el rol se exige
// acá, antes de tocar la base (el layout del panel no protege). Los datos los valida el servicio con Zod.
// Si se escribió, se invalida el tag del contenido: la landing muestra el cambio en el próximo pedido.

function texto(formData: FormData, nombre: string): string {
  const valor = formData.get(nombre);
  return typeof valor === "string" ? valor : "";
}

function invalidarSiSalioBien(r: ResultadoServicio): void {
  if (r.ok) updateTag(TAG_CONTENIDO);
}

/** Crea (`id` null) o edita el servicio con los campos del formulario. Si sale bien, vuelve a la lista. */
export async function guardarServicioAccion(
  id: string | null,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirRol(id ? rutaEdicion(id) : RUTA_NUEVO_SERVICIO, "admin");
  const valores: ValoresFormulario = {
    titulo: texto(formData, "titulo"),
    descripcion: texto(formData, "descripcion"),
    ilustracion: texto(formData, "ilustracion"),
    icono: texto(formData, "icono"),
    imagen: texto(formData, "imagen"),
    publicado: formData.get("publicado") === "on",
  };
  const r = id ? await editarServicio(id, valores) : await crearServicio(valores);
  if (!r.ok) return { error: r.mensaje, campos: r.campos ?? {}, valores };
  invalidarSiSalioBien(r);
  redirect(RUTA_SERVICIOS);
}

/** Publica (`true`) o despublica (`false`) el servicio. */
export async function publicarServicioAccion(id: string, publicado: boolean): Promise<void> {
  await requerirRol(RUTA_SERVICIOS, "admin");
  invalidarSiSalioBien(await publicarServicio(id, publicado));
  refresh();
}

/** Sube o baja el servicio un lugar en el orden de la landing. */
export async function moverServicioAccion(id: string, direccion: "subir" | "bajar"): Promise<void> {
  await requerirRol(RUTA_SERVICIOS, "admin");
  invalidarSiSalioBien(await moverServicio(id, direccion));
  refresh();
}

export async function borrarServicioAccion(id: string): Promise<void> {
  await requerirRol(RUTA_SERVICIOS, "admin");
  invalidarSiSalioBien(await borrarServicio(id));
  refresh();
}
