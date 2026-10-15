import type { Rol } from "@/models/Usuario";

export type SesionMinima = { user?: { id?: string | null; rol?: Rol | null } | null } | null;
export type Acceso =
  | { ok: true; id: string; rol: Rol }
  | { ok: false; motivo: "sin-sesion" | "sin-permiso" };

/**
 * Decide si una sesión alcanza para `roles` (vacío = cualquier usuario con sesión).
 * El rol se relee de la base: el del token puede estar viejo (épica #31, decisión 2).
 */
export async function evaluarAcceso(
  sesion: SesionMinima,
  roles: readonly Rol[],
  buscar: (id: string) => Promise<Rol | null>,
): Promise<Acceso> {
  const id = sesion?.user?.id;
  if (!id) return { ok: false, motivo: "sin-sesion" };
  const rol = await buscar(id);
  if (!rol) return { ok: false, motivo: "sin-sesion" };
  if (roles.length > 0 && !roles.includes(rol)) return { ok: false, motivo: "sin-permiso" };
  return { ok: true, id, rol };
}

// Stub: el test se escribe antes que la lógica.
export function rutaInterna(ruta: string): string {
  return ruta;
}
