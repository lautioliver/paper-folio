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
import type { EstadoAccion, EstadoFormulario, ValoresFormulario } from "./tipos";

// Cada acción se puede llamar directo (un POST armado a mano, con cualquier id o valor): el rol se exige
// acá, antes de tocar la base (el layout del panel no protege). Los datos los valida el servicio con Zod.
// Si se escribió, se invalida el tag del contenido: la landing muestra el cambio en el próximo pedido.

function texto(formData: FormData, nombre: string): string {
  const valor = formData.get(nombre);
  return typeof valor === "string" ? valor : "";
}

// `previo` lo reenvía el cliente: si no es un entero, se arranca de cero (solo es la clave del formulario).
function siguienteEnvio(previo: EstadoFormulario | undefined): number {
  const envio = previo?.envio;
  return (typeof envio === "number" && Number.isSafeInteger(envio) && envio >= 0 ? envio : 0) + 1;
}

// "true" y "false" son booleanos; cualquier otro valor pasa crudo, así lo rechaza la validación del servicio.
function booleano(valor: string): boolean | string {
  return valor === "true" ? true : valor === "false" ? false : valor;
}

function invalidarSiSalioBien(r: ResultadoServicio): void {
  if (r.ok) updateTag(TAG_CONTENIDO);
}

/** Crea (`id` null) o edita el servicio con los campos del formulario. Si sale bien, vuelve a la lista. */
export async function guardarServicioAccion(
  id: string | null,
  previo: EstadoFormulario,
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
  // Vuelve lo que se mandó y un envío más: el formulario se vuelve a montar con estos valores.
  if (!r.ok) return { error: r.mensaje, campos: r.campos ?? {}, valores, envio: siguienteEnvio(previo) };
  invalidarSiSalioBien(r);
  redirect(RUTA_SERVICIOS);
}

/**
 * Resultado de una acción de la lista. Refresca si salió bien o si la pantalla estaba vieja (ya no existe):
 * así se ve la lista real junto con el mensaje. Con un valor inválido no refresca: no cambió nada.
 */
function lista(r: ResultadoServicio): EstadoAccion {
  invalidarSiSalioBien(r);
  if (r.ok || r.error === "no-encontrado") refresh();
  return { error: r.ok ? null : r.mensaje };
}

// Las acciones de la lista son una sola por tipo para toda la lista, no una por fila: si no, el mensaje se
// iría con la fila al refrescar. El id y el valor llegan como campos del formulario; los valida el servicio.

/** Publica (`true`) o despublica (`false`) el servicio. `id` y `publicado` ("true" o "false"): campos ocultos del formulario. */
export async function publicarServicioAccion(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirRol(RUTA_SERVICIOS, "admin");
  return lista(await publicarServicio(texto(formData, "id"), booleano(texto(formData, "publicado"))));
}

/** Sube o baja el servicio un lugar en el orden de la landing. `id` y `direccion`: campos ocultos del formulario. */
export async function moverServicioAccion(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirRol(RUTA_SERVICIOS, "admin");
  return lista(await moverServicio(texto(formData, "id"), texto(formData, "direccion")));
}

/** `id`: lo que se borra (campo oculto del formulario). */
export async function borrarServicioAccion(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirRol(RUTA_SERVICIOS, "admin");
  return lista(await borrarServicio(texto(formData, "id")));
}
