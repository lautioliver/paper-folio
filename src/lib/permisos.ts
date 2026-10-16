import { connection } from "next/server";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Rol } from "@/models/Usuario";
import { evaluarAcceso, urlDeIngreso } from "./acceso";
import { buscarRol } from "./usuarios";

export { evaluarAcceso, rutaInterna, RUTA_INGRESO, type Acceso, type SesionMinima } from "./acceso";

/**
 * Para páginas y server actions: devuelve el usuario con sesión o redirige a `/ingresar`,
 * volviendo después a `volverA` (una ruta interna).
 */
export async function requerirSesion(volverA: string): Promise<{ id: string; rol: Rol }> {
  // Con `cacheComponents`, Auth.js genera un token CSRF (`crypto.getRandomValues`) en cada `auth()`: Next lo
  // toma por un valor inestable de prerender y lo loguea como error. `connection()` marca la ruta como dinámica.
  await connection();
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
  await connection(); // ver `requerirSesion`
  const acceso = await evaluarAcceso(await auth(), [rol, ...otros], (id) => buscarRol(id));
  if (!acceso.ok && acceso.motivo !== "sin-permiso") redirect(urlDeIngreso(volverA, acceso.motivo));
  if (!acceso.ok) forbidden();
  return { id: acceso.id, rol: acceso.rol };
}

/** Para route handlers (stub). */
export async function requerirRolApi(
  rol: Rol,
  ...otros: Rol[]
): Promise<{ ok: true; id: string; rol: Rol } | { ok: false; respuesta: Response }> {
  void otros;
  return { ok: true, id: "", rol };
}
