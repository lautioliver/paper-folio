// Comprobación de tipos (la corre `npm run typecheck`, no Vitest): `requerirRol` exige al menos un rol.
// Si alguien vuelve a hacer opcional el rol, el @ts-expect-error queda sin error y tsc falla.
import { requerirRol } from "./permisos";

export async function _sinRolesNoCompila(): Promise<void> {
  // @ts-expect-error: falta el rol (sin roles, cualquier sesión pasaría).
  await requerirRol("/panel");
  await requerirRol("/panel", "operador", "admin");
}
