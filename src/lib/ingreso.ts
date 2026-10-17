import { z } from "zod";
import type { Rol } from "@/models/Usuario";
import { evaluarAcceso, rutaInterna, type EstadoRol, type SesionMinima } from "./acceso";

/** Estado de la sesión visto desde /ingresar: sin token, token con usuario en la base, o token huérfano. */
// "error": hay token pero no se pudo comprobar contra la base (no responde).
// "bloqueada" (#49): el usuario existe pero un admin lo bloqueó.
export type EstadoSesion = "ninguna" | "valida" | "huerfana" | "bloqueada" | "error";

export type DecisionIngreso =
  | { accion: "redirigir"; destino: string }
  | { accion: "mostrar"; aviso: AvisoIngreso; callbackUrl: string };

/**
 * Qué muestra /ingresar. Con sesión:
 * - "sesion": el token existe pero el usuario no está en la base; se ofrece salir e ingresar de nuevo.
 * - "bloqueada": la base dice que la sesión actual está bloqueada; solo "Salir".
 * - "verificacion": no se pudo comprobar la sesión contra la base.
 * Sin sesión, según el `error` de la URL (lo manda `signIn` o Auth.js con `pages`):
 * - "ingreso-bloqueado": `error=bloqueado` (cualquiera puede armar el link): avisa y deja probar con otra cuenta.
 * - "reintentar": `signIn` no pudo comprobar la cuenta (la base no respondió).
 * - "denegado": AccessDenied, `signIn` dio false (email sin verificar).
 * - "google": Google no completó el ingreso (la persona lo canceló, o falló el intercambio con Google).
 * - "cuenta-no-vinculada": el email ya está vinculado a otra forma de ingreso.
 * - "vencido": el ingreso venció antes de terminar (CSRF o link vencido).
 * - "configuracion": falla del sitio; reintentar no lo arregla.
 * - "generico": cualquier otro código, o un `error` repetido. Nunca se muestra el texto de la URL.
 */
export type AvisoIngreso =
  | "sesion"
  | "bloqueada"
  | "ingreso-bloqueado"
  | "denegado"
  | "reintentar"
  | "generico"
  | "verificacion"
  | "google"
  | "cuenta-no-vinculada"
  | "vencido"
  | "configuracion"
  | null;

/**
 * Los `error` que /ingresar conoce: los de la app (`urlDeIngreso`, `permiteIngreso`) y los de Auth.js que pueden
 * llegar con Google (`ErrorPageParam`, `SignInPageErrorParam` y los errores "seguros para el cliente" de
 * @auth/core 0.41; el resto de sus fallas llega como Configuration). Los de credenciales, email o WebAuthn no
 * aplican a este sitio y van al genérico.
 */
const errorConocido = z.enum([
  "sesion",
  "bloqueado",
  "reintentar",
  "AccessDenied",
  "OAuthCallbackError",
  "OAuthSignin",
  "Callback",
  "Signin",
  "OAuthCreateAccount",
  "Configuration",
  "Verification",
  "MissingCSRF",
  "OAuthAccountNotLinked",
  "AccountNotLinked",
  "SessionRequired",
]);
const AVISO_DE_ERROR = {
  sesion: null,
  bloqueado: "ingreso-bloqueado",
  reintentar: "reintentar",
  AccessDenied: "denegado",
  OAuthCallbackError: "google",
  OAuthSignin: "google",
  Callback: "google",
  Signin: "google",
  OAuthCreateAccount: "google",
  Configuration: "configuracion",
  Verification: "vencido",
  MissingCSRF: "vencido",
  OAuthAccountNotLinked: "cuenta-no-vinculada",
  AccountNotLinked: "cuenta-no-vinculada",
  // Auth.js pide ingresar: es la pantalla normal.
  SessionRequired: null,
} as const satisfies Record<z.infer<typeof errorConocido>, AvisoIngreso>;

// Un solo `error`, string. Repetido (?error=a&error=b) llega como array: no es un pedido normal y va al genérico.
const errorDeLaUrl = z.string().optional();
// El `callbackUrl` de la URL: un solo string y ruta interna; si no, "/".
const rutaDeLaUrl = z.string().refine((ruta) => rutaInterna(ruta) === ruta);

/** Aviso para el `error` de la URL sin sesión: uno por código conocido, "generico" para el resto. */
function avisoDeError(error: unknown): AvisoIngreso {
  const leido = errorDeLaUrl.safeParse(error);
  if (!leido.success) return "generico";
  if (!leido.data) return null;
  const conocido = errorConocido.safeParse(leido.data);
  return conocido.success ? AVISO_DE_ERROR[conocido.data] : "generico";
}

/**
 * A dónde volver después de ingresar. Manda el `callbackUrl` de la query; si no hay y vino un `error`, la ruta
 * que Auth.js guardó al empezar el ingreso (`vueltaGuardada`): ni `signIn` ni Auth.js lo pasan al mandar acá.
 */
function destinoDeVuelta(callbackUrl: unknown, vueltaGuardada: unknown, conError: boolean): string {
  if (callbackUrl === undefined && conError) return rutaDeLaUrl.catch("/").parse(vueltaGuardada);
  return rutaDeLaUrl.catch("/").parse(callbackUrl);
}

/**
 * A dónde lleva /ingresar según la sesión, `error` y `callbackUrl` (ADR-002 R-5). Los dos se validan con Zod:
 * el `callbackUrl` tiene que ser una ruta interna (`rutaInterna`); uno externo, o repetido en la query, vuelve
 * a "/". Con `error=sesion` o con sesión huérfana no se redirige: devolverlo a la página lo haría rebotar.
 */
export function decidirIngreso(entrada: {
  sesion: EstadoSesion;
  error?: string | string[];
  callbackUrl?: string | string[];
  /** La ruta de la cookie callback-url de Auth.js (`rutaDeCookieDeVuelta`). */
  vueltaGuardada?: string;
}): DecisionIngreso {
  const conError = entrada.error !== undefined && entrada.error !== "";
  const callbackUrl = destinoDeVuelta(entrada.callbackUrl, entrada.vueltaGuardada, conError);
  const errorDeSesion = entrada.error === "sesion";
  // Sin poder comprobar la base no se sabe si la sesión sirve: no se redirige (podría rebotar).
  if (entrada.sesion === "error") return { accion: "mostrar", aviso: "verificacion", callbackUrl };
  // Cuenta bloqueada (#49): no se redirige, rebotaría. El estado sale de la base, no de `error=bloqueado`:
  // si la desbloquearon en el medio, la sesión vuelve a ser válida y se redirige como siempre.
  if (entrada.sesion === "bloqueada") return { accion: "mostrar", aviso: "bloqueada", callbackUrl };
  if (entrada.sesion === "huerfana" || (entrada.sesion === "valida" && errorDeSesion)) {
    return { accion: "mostrar", aviso: "sesion", callbackUrl };
  }
  if (entrada.sesion === "valida") return { accion: "redirigir", destino: callbackUrl };
  // Auth.js manda acá sus errores (`pages` en src/auth.ts) y `signIn` sus URLs (`permiteIngreso`).
  return { accion: "mostrar", aviso: avisoDeError(entrada.error), callbackUrl };
}

// La cookie callback-url de Auth.js: la URL absoluta (ya validada por su callback `redirect`, del mismo sitio) o
// una ruta. Solo http(s).
const urlDeLaCookie = z.string().min(1);

/**
 * La ruta interna de la cookie callback-url que Auth.js guarda al empezar el ingreso (ruta, query y hash, sin el
 * origen). `undefined` si no hay cookie o si la ruta no es interna: nunca devuelve algo que lleve a otro sitio.
 */
export function rutaDeCookieDeVuelta(valor: unknown): string | undefined {
  const leido = urlDeLaCookie.safeParse(valor);
  if (!leido.success) return undefined;
  // Una ruta suelta tiene que ser interna tal cual ("//host" o una barra invertida llevarían a otro sitio).
  if (leido.data.startsWith("/")) return rutaInterna(leido.data) === leido.data ? leido.data : undefined;
  let url: URL;
  try {
    url = new URL(leido.data);
  } catch {
    return undefined;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
  const ruta = `${url.pathname}${url.search}${url.hash}`;
  return rutaInterna(ruta) === ruta ? ruta : undefined;
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
    if (acceso.motivo === "bloqueado") return "bloqueada";
    return acceso.motivo === "sesion-huerfana" ? "huerfana" : "ninguna";
  } catch (error) {
    console.error("ingreso: no se pudo comprobar la sesión", error instanceof Error ? error.name : "desconocido");
    return "error";
  }
}
