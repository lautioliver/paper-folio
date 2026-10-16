import type { Rol } from "@/models/Usuario";
import { evaluarAcceso, rutaInterna, type EstadoRol, type SesionMinima } from "./acceso";

/** Estado de la sesión visto desde /ingresar: sin token, token con usuario en la base, o token huérfano. */
// "error": hay token pero no se pudo comprobar contra la base (no responde).
// "bloqueada" (#49): el usuario existe pero un admin lo bloqueó.
export type EstadoSesion = "ninguna" | "valida" | "huerfana" | "bloqueada" | "error";

export type DecisionIngreso =
  | { accion: "redirigir"; destino: string }
  // aviso "sesion": el token existe pero el usuario no está en la base; se ofrece salir e ingresar de nuevo.
  // aviso "bloqueada": la cuenta está bloqueada; solo se ofrece salir.
  | { accion: "mostrar"; aviso: "sesion" | "bloqueada" | "verificacion" | null; callbackUrl: string };

/**
 * A dónde lleva /ingresar según la sesión, `error` y `callbackUrl` (ADR-002 R-5). El `callbackUrl` pasa
 * siempre por `rutaInterna`: uno externo, o repetido en la query, vuelve a "/". Con `error=sesion` o con
 * sesión huérfana no se redirige: devolverlo a la página lo haría rebotar.
 */
export function decidirIngreso(entrada: {
  sesion: EstadoSesion;
  error?: string | string[];
  callbackUrl?: string | string[];
}): DecisionIngreso {
  const callbackUrl = rutaInterna(typeof entrada.callbackUrl === "string" ? entrada.callbackUrl : "/");
  const errorDeSesion = entrada.error === "sesion";
  // Sin poder comprobar la base no se sabe si la sesión sirve: no se redirige (podría rebotar).
  if (entrada.sesion === "error") return { accion: "mostrar", aviso: "verificacion", callbackUrl };
  if (entrada.sesion === "huerfana" || (entrada.sesion === "valida" && errorDeSesion)) {
    return { accion: "mostrar", aviso: "sesion", callbackUrl };
  }
  if (entrada.sesion === "valida") return { accion: "redirigir", destino: callbackUrl };
  return { accion: "mostrar", aviso: null, callbackUrl };
}

/** Si el menú muestra "Panel". Es solo UI: el panel se protege en el servidor (`requerirRol`). */
export function puedeVerPanel(rol: Rol | null | undefined): boolean {
  return rol === "operador" || rol === "admin";
}

/**
 * Estado de la sesión para /ingresar. Relee el rol de la base; si la base no responde devuelve "error"
 * en vez de lanzar: /ingresar es la página para recuperarse y no puede quedar en 500.
 */
export async function comprobarSesion(
  sesion: SesionMinima,
  buscar: (id: string) => Promise<EstadoRol>,
): Promise<EstadoSesion> {
  try {
    const acceso = await evaluarAcceso(sesion, [], buscar);
    if (acceso.ok) return "valida";
    return acceso.motivo === "sesion-huerfana" ? "huerfana" : "ninguna";
  } catch (error) {
    console.error("ingreso: no se pudo comprobar la sesión", error instanceof Error ? error.name : "desconocido");
    return "error";
  }
}
