import type { Rol } from "@/models/Usuario";
import { rutaInterna } from "./acceso";

/** Estado de la sesión visto desde /ingresar: sin token, token con usuario en la base, o token huérfano. */
export type EstadoSesion = "ninguna" | "valida" | "huerfana";

export type DecisionIngreso =
  | { accion: "redirigir"; destino: string }
  // aviso "sesion": el token existe pero el usuario no está en la base; se ofrece salir e ingresar de nuevo.
  | { accion: "mostrar"; aviso: "sesion" | null; callbackUrl: string };

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
  if (entrada.sesion === "huerfana" || (entrada.sesion === "valida" && errorDeSesion)) {
    return { accion: "mostrar", aviso: "sesion", callbackUrl };
  }
  if (entrada.sesion === "valida") return { accion: "redirigir", destino: callbackUrl };
  return { accion: "mostrar", aviso: null, callbackUrl };
}

/** URL de /ingresar para volver después a `callbackUrl` (solo rutas internas). */
export function urlDeIngreso(callbackUrl: string): string {
  return `/ingresar?callbackUrl=${encodeURIComponent(rutaInterna(callbackUrl))}`;
}

/** Si el menú muestra "Panel". Es solo UI: el panel se protege en el servidor (`requerirRol`). */
export function puedeVerPanel(rol: Rol | null | undefined): boolean {
  return rol === "operador" || rol === "admin";
}
