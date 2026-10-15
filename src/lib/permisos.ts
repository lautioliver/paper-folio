import type { Rol } from "@/models/Usuario";

export type SesionMinima = { user?: { id?: string | null; rol?: Rol | null } | null } | null;
export type Acceso =
  | { ok: true; id: string; rol: Rol }
  | { ok: false; motivo: "sin-sesion" | "sin-permiso" };

// Stub: los tests se escriben antes que la lógica.
export async function evaluarAcceso(
  _sesion: SesionMinima,
  _roles: readonly Rol[],
  _buscarRol: (id: string) => Promise<Rol | null>,
): Promise<Acceso> {
  return { ok: true, id: "", rol: "admin" };
}
