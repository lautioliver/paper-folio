import type { Rol } from "@/models/Usuario";

export type SesionMinima = { user?: { id?: string | null; rol?: Rol | null } | null } | null;
export type Acceso =
  | { ok: true; id: string; rol: Rol }
  // sesion-huerfana: el token es válido pero el usuario ya no está en la base (base reseteada, usuario
  // borrado). Se distingue de sin-sesion para que /ingresar no lo devuelva a la página y rebote.
  | { ok: false; motivo: "sin-sesion" | "sin-permiso" | "sesion-huerfana" };

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
  if (!rol) return { ok: false, motivo: "sesion-huerfana" };
  if (roles.length > 0 && !roles.includes(rol)) return { ok: false, motivo: "sin-permiso" };
  return { ok: true, id, rol };
}

/**
 * Solo rutas internas para volver después de ingresar: empieza con una sola "/" (ni "//host" ni "/\\host",
 * que el navegador trata como otro sitio). Cualquier otra cosa vuelve al inicio.
 */
export function rutaInterna(ruta: string): string {
  return /^\/(?![/\\])/.test(ruta) ? ruta : "/";
}
