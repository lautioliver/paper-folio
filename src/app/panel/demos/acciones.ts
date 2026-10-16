"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG_CONTENIDO } from "@/lib/contenido";
import { activarDemo, borrarDemo, crearDemo, editarDemo, moverDemo, type ResultadoDemo } from "@/lib/demos-admin";
import { requerirRol } from "@/lib/permisos";
import { RUTA_DEMOS, RUTA_NUEVA_DEMO, rutaEdicion } from "./rutas";
import type { EstadoFormulario, ValoresFormulario } from "./tipos";

// Cada acción se puede llamar directo (un POST armado a mano, con cualquier id o valor): el rol se exige
// acá, antes de tocar la base (el layout del panel no protege, ADR-002 R-3). Los datos los valida el
// servicio con Zod. Si se escribió, se invalida el tag del contenido: el detalle del proyecto muestra el
// cambio en el próximo pedido, sin redeploy.

function texto(formData: FormData, nombre: string): string {
  const valor = formData.get(nombre);
  return typeof valor === "string" ? valor : "";
}

// `previo` lo reenvía el cliente: si no es un entero, se arranca de cero (solo es la clave del formulario).
function siguienteEnvio(previo: EstadoFormulario | undefined): number {
  const envio = previo?.envio;
  return (typeof envio === "number" && Number.isSafeInteger(envio) && envio >= 0 ? envio : 0) + 1;
}

function invalidarSiSalioBien(r: ResultadoDemo): void {
  if (r.ok) updateTag(TAG_CONTENIDO);
}

/** Crea (`id` null) o edita la demo con los campos del formulario. Si sale bien, vuelve a la lista. */
export async function guardarDemoAccion(
  id: string | null,
  previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirRol(id ? rutaEdicion(id) : RUTA_NUEVA_DEMO, "admin");
  const valores: ValoresFormulario = {
    proyecto: texto(formData, "proyecto"),
    titulo: texto(formData, "titulo"),
    url: texto(formData, "url"),
    descripcion: texto(formData, "descripcion"),
    activa: formData.get("activa") === "on",
  };
  const r = id ? await editarDemo(id, valores) : await crearDemo(valores);
  // Vuelve lo que se mandó y un envío más: el formulario se vuelve a montar con estos valores.
  if (!r.ok) return { error: r.mensaje, campos: r.campos ?? {}, valores, envio: siguienteEnvio(previo) };
  invalidarSiSalioBien(r);
  redirect(RUTA_DEMOS);
}

/** Activa (`true`) o desactiva (`false`) la demo. */
export async function activarDemoAccion(id: string, activa: boolean): Promise<void> {
  await requerirRol(RUTA_DEMOS, "admin");
  invalidarSiSalioBien(await activarDemo(id, activa));
  refresh();
}

/** Sube o baja la demo un lugar entre las de su proyecto. */
export async function moverDemoAccion(id: string, direccion: "subir" | "bajar"): Promise<void> {
  await requerirRol(RUTA_DEMOS, "admin");
  invalidarSiSalioBien(await moverDemo(id, direccion));
  refresh();
}

export async function borrarDemoAccion(id: string): Promise<void> {
  await requerirRol(RUTA_DEMOS, "admin");
  invalidarSiSalioBien(await borrarDemo(id));
  refresh();
}
