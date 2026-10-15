import { forbidden, redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Rol } from "@/models/Usuario";
import { evaluarAcceso } from "./acceso";
import { buscarRol } from "./usuarios";

export { evaluarAcceso, type Acceso, type SesionMinima } from "./acceso";

/** Página de ingreso (la arma #35). */
export const RUTA_INGRESO = "/ingresar";

function urlDeIngreso(volverA: string): string {
  return `${RUTA_INGRESO}?callbackUrl=${encodeURIComponent(volverA)}`;
}

/**
 * Para páginas y server actions: devuelve el usuario con sesión o redirige a `/ingresar`,
 * volviendo después a `volverA` (una ruta interna).
 */
export async function requerirSesion(volverA: string): Promise<{ id: string; rol: Rol }> {
  const acceso = await evaluarAcceso(await auth(), [], buscarRol);
  if (!acceso.ok) redirect(urlDeIngreso(volverA));
  return { id: acceso.id, rol: acceso.rol };
}

/** Como `requerirSesion`, pero además exige uno de `roles`; si no alcanza, responde 403 (`forbidden()`). */
export async function requerirRol(volverA: string, ...roles: Rol[]): Promise<{ id: string; rol: Rol }> {
  const acceso = await evaluarAcceso(await auth(), roles, buscarRol);
  if (!acceso.ok && acceso.motivo === "sin-sesion") redirect(urlDeIngreso(volverA));
  if (!acceso.ok) forbidden();
  return { id: acceso.id, rol: acceso.rol };
}
