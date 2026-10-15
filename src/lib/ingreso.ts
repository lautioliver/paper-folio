import type { Rol } from "@/models/Usuario";

/** Estado de la sesión visto desde /ingresar: sin token, token con usuario en la base, o token huérfano. */
export type EstadoSesion = "ninguna" | "valida" | "huerfana";

export type DecisionIngreso = { accion: "redirigir"; destino: string } | { accion: "mostrar"; aviso: "sesion" | null; callbackUrl: string };

export function decidirIngreso(_: { sesion: EstadoSesion; error?: string; callbackUrl?: string | string[] }): DecisionIngreso {
  return { accion: "mostrar", aviso: null, callbackUrl: "/" };
}

export function urlDeIngreso(_callbackUrl: string): string {
  return "/";
}

export function puedeVerPanel(_rol: Rol | null | undefined): boolean {
  return true;
}
