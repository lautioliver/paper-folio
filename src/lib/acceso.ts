import type { Rol } from "@/models/Usuario";
import { respuestaError } from "./api-error";

export type SesionMinima = { user?: { id?: string | null; rol?: Rol | null } | null } | null;
/** Lo que dice la base de un usuario para los permisos: su rol, que está bloqueado (#49) o que no existe. */
export type EstadoRol = Rol | "bloqueado" | null;
export type Acceso =
  | { ok: true; id: string; rol: Rol }
  // sesion-huerfana: el token es válido pero el usuario ya no está en la base (base reseteada, usuario
  // borrado). Se distingue de sin-sesion para que /ingresar no lo devuelva a la página y rebote.
  // bloqueado (#49): un admin le bloqueó la cuenta; sus sesiones abiertas dejan de servir al instante.
  | { ok: false; motivo: "sin-sesion" | "sin-permiso" | "sesion-huerfana" | "bloqueado" };

/**
 * Decide si una sesión alcanza para `roles` (vacío = cualquier usuario con sesión).
 * El rol se relee de la base: el del token puede estar viejo (épica #31, decisión 2).
 */
export async function evaluarAcceso(
  sesion: SesionMinima,
  roles: readonly Rol[],
  buscar: (id: string) => Promise<EstadoRol>,
): Promise<Acceso> {
  const id = sesion?.user?.id;
  if (!id) return { ok: false, motivo: "sin-sesion" };
  const rol = await buscar(id);
  if (!rol) return { ok: false, motivo: "sesion-huerfana" };
  if (rol === "bloqueado") return { ok: false, motivo: "sesion-huerfana" }; // STUB
  if (roles.length > 0 && !roles.includes(rol)) return { ok: false, motivo: "sin-permiso" };
  return { ok: true, id, rol };
}

/**
 * Solo rutas internas para volver después de ingresar: empieza con una sola "/", sin espacios ni caracteres de control, (ni "//host" ni "/\\host",
 * que el navegador trata como otro sitio). Cualquier otra cosa vuelve al inicio.
 */
export function rutaInterna(ruta: string): string {
  // Sin espacios ni caracteres de control: el navegador descarta tabs y saltos ("/\t/host" → "//host").
  return /^\/(?![/\\])[^\s\u0000-\u001f\u007f]*$/.test(ruta) ? ruta : "/";
}

/** Página de ingreso (la arma #35). */
export const RUTA_INGRESO = "/ingresar";

/**
 * URL de `/ingresar` para volver a `volverA` (solo rutas internas) después de ingresar. Con sesión huérfana
 * suma `error=sesion`: /ingresar (#35) no debe devolverlo a la página, tiene que ofrecer ingresar de nuevo.
 */
export function urlDeIngreso(volverA: string, motivo: Exclude<Acceso, { ok: true }>["motivo"]): string {
  const url = `${RUTA_INGRESO}?callbackUrl=${encodeURIComponent(rutaInterna(volverA))}`;
  return motivo === "sesion-huerfana" ? `${url}&error=sesion` : url; // STUB bloqueado
}

/**
 * Respuesta de una API cuando la sesión no alcanza, con el formato único de error y sin redirect:
 * 401 `SIN_SESION` (sin sesión o con sesión huérfana) o 403 `SIN_PERMISO` (sin el rol).
 */
export function respuestaSinAcceso(motivo: Exclude<Acceso, { ok: true }>["motivo"]): Response {
  return motivo === "sin-permiso"
    ? respuestaError(403, "SIN_PERMISO", "No tenés permiso para hacer esto.")
    : respuestaError(401, "SIN_SESION", "Tu sesión venció. Ingresá de nuevo.");
}

/** Emails de una lista separada por comas (`ADMIN_EMAILS`), normalizados. */
export function emailsDeLista(lista: string): Set<string> {
  return new Set(
    lista
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Callback `signIn` de Auth.js (#49): solo cuentas de Google con el email verificado y que no estén
 * bloqueadas en `usuarios`. Si la base no responde, lanza: el ingreso falla cerrado.
 */
export async function permiteIngreso(
  datos: { proveedor?: string | null; emailVerificado?: boolean | null; email?: string | null },
  estaBloqueado: (email: string) => Promise<boolean>,
): Promise<boolean> {
  void estaBloqueado; // STUB
  return datos.proveedor === "google" && datos.emailVerificado === true;
}

export type CambioUsuario = { tipo: "rol"; rol: Rol } | { tipo: "bloqueo"; bloqueado: boolean };
export type RechazoCambio = "propio" | "entorno" | "ultimo-admin";

/**
 * Reglas del panel de usuarios (#49, enmienda de ADR-002 R-4). `null` si el cambio se puede hacer.
 * - "propio": un admin no se cambia el rol ni se bloquea a sí mismo.
 * - "entorno": a un email de `ADMIN_EMAILS` no se lo degrada ni se lo bloquea (sí se lo puede desbloquear).
 * - "ultimo-admin": no se le quita el admin al único admin que queda (`otrosAdmins`: los vigentes sin contarlo).
 */
export function revisarCambio(entrada: {
  actorId: string;
  objetivo: { id: string; rol: Rol; bloqueado: boolean; porEntorno: boolean };
  cambio: CambioUsuario;
  otrosAdmins: number;
}): RechazoCambio | null {
  void entrada; // STUB
  return null;
}
