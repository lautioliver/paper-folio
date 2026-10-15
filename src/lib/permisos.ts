import { forbidden, redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Rol } from "@/models/Usuario";
import { evaluarAcceso, rutaInterna, type Acceso } from "./acceso";
import { buscarRol } from "./usuarios";

export { evaluarAcceso, rutaInterna, type Acceso, type SesionMinima } from "./acceso";

/** Página de ingreso (la arma #35). */
export const RUTA_INGRESO = "/ingresar";

function urlDeIngreso(volverA: string, motivo: Exclude<Acceso, { ok: true }>["motivo"]): string {
  const url = `${RUTA_INGRESO}?callbackUrl=${encodeURIComponent(rutaInterna(volverA))}`;
  // Con sesión huérfana /ingresar (#35) no debe devolverlo a la página: tiene que ofrecer ingresar de nuevo.
  return motivo === "sesion-huerfana" ? `${url}&error=sesion` : url;
}

/**
 * Para páginas y server actions: devuelve el usuario con sesión o redirige a `/ingresar`,
 * volviendo después a `volverA` (una ruta interna).
 */
export async function requerirSesion(volverA: string): Promise<{ id: string; rol: Rol }> {
  const acceso = await evaluarAcceso(await auth(), [], (id) => buscarRol(id));
  if (!acceso.ok) redirect(urlDeIngreso(volverA, acceso.motivo));
  return { id: acceso.id, rol: acceso.rol };
}

/**
 * Como `requerirSesion`, pero además exige uno de los roles; si no alcanza, responde 403 (`forbidden()`).
 * La firma pide al menos un rol: sin roles, "cualquier sesión" pasaría y sería un permiso abierto.
 */
export async function requerirRol(
  volverA: string,
  rol: Rol,
  ...otros: Rol[]
): Promise<{ id: string; rol: Rol }> {
  const acceso = await evaluarAcceso(await auth(), [rol, ...otros], (id) => buscarRol(id));
  if (!acceso.ok && acceso.motivo !== "sin-permiso") redirect(urlDeIngreso(volverA, acceso.motivo));
  if (!acceso.ok) forbidden();
  return { id: acceso.id, rol: acceso.rol };
}
