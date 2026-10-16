"use server";

import { redirect } from "next/navigation";
import { requerirRol } from "@/lib/permisos";
import { cambiarBloqueoUsuario, cambiarRolUsuario, type ResultadoUsuario } from "@/lib/usuarios-admin";
import { filtrosDe, rutaUsuarios, RUTA_USUARIOS, type CodigoAviso } from "./ruta";

// Cada acción se puede llamar directo (un POST armado a mano, con cualquier id o valor): el rol se exige
// acá, antes de tocar la base (el layout del panel no protege). El actor sale de la sesión, nunca del
// formulario; el id, el rol y el bloqueo los valida el servicio con Zod. Después vuelve a la lista (con la
// misma búsqueda y página) y el aviso va como código en la URL: la página se renderiza de nuevo en el
// servidor y no queda ningún estado de formulario que Next pueda conservar viejo.

function volver(formData: FormData, r: ResultadoUsuario, siSalioBien: CodigoAviso): never {
  const { q, pagina } = filtrosDe({ q: formData.get("q") ?? undefined, pagina: formData.get("pagina") ?? undefined });
  redirect(rutaUsuarios({ q, pagina, aviso: r.ok ? siSalioBien : r.error }));
}

/** Cambia el rol de un usuario (`usuario`, `operador` o `admin`). */
export async function cambiarRolAccion(id: string, rol: string, formData: FormData): Promise<void> {
  const { id: actor } = await requerirRol(RUTA_USUARIOS, "admin");
  volver(formData, await cambiarRolUsuario(actor, id, rol), "rol-cambiado");
}

/** Bloquea (`true`) o desbloquea (`false`) una cuenta. */
export async function cambiarBloqueoAccion(id: string, bloqueado: boolean, formData: FormData): Promise<void> {
  const { id: actor } = await requerirRol(RUTA_USUARIOS, "admin");
  volver(formData, await cambiarBloqueoUsuario(actor, id, bloqueado), bloqueado ? "bloqueado" : "desbloqueado");
}
