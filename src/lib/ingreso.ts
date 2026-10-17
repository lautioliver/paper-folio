import { z } from "zod";
import type { Rol } from "@/models/Usuario";
import { esquemaRutaInterna, evaluarAcceso, RUTA_INGRESO, type EstadoRol, type SesionMinima } from "./acceso";

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
 * - "configuracion": Auth.js manda así todo lo que no muestra al cliente (configuración, InvalidCheck, la base
 *   caída en el callback `jwt`): es del sitio, no de la persona, y se ofrece reintentar.
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

// Los avisos con sesión tienen su propia pantalla; todos los demás tienen que estar en AVISOS_SIN_SESION.
export type AvisoSinSesion = Exclude<AvisoIngreso, "sesion" | "bloqueada" | "verificacion" | null>;

// Avisos sin sesión, según el `error` de la URL (`decidirIngreso`): el texto es siempre uno de estos, nunca el de
// la URL. `boton`: "google" reintenta con la misma cuenta; "otra-cuenta" abre el selector de cuentas de Google.
export const AVISOS_SIN_SESION = {
  "ingreso-bloqueado": {
    texto:
      "Esa cuenta está bloqueada: no puede ingresar al sitio. Si creés que es un error, escribinos por el formulario de contacto.",
    boton: "otra-cuenta",
  },
  denegado: {
    texto:
      "No pudimos dejarte ingresar: la cuenta de Google tiene que tener el email verificado. Si creés que es un error, escribinos por el formulario de contacto.",
    boton: "otra-cuenta",
  },
  reintentar: { texto: "No pudimos verificar tu cuenta. Probá de nuevo en un rato.", boton: "google" },
  google: { texto: "No se completó el ingreso con Google. Si lo cancelaste, podés probar de nuevo.", boton: "google" },
  "cuenta-no-vinculada": {
    texto: "Ese email ya se usó para ingresar de otra forma. Probá con otra cuenta de Google.",
    boton: "otra-cuenta",
  },
  vencido: { texto: "El ingreso venció antes de terminar. Probá de nuevo.", boton: "google" },
  // Auth.js 0.41 manda Configuration también en fallas pasajeras (InvalidCheck, la base caída en `jwt`): se
  // ofrece reintentar, sin culpar a la persona (decisión de @lautioliver en el PR #73).
  configuracion: { texto: "Hubo un problema de nuestro lado al iniciar sesión. Probá de nuevo en un rato.", boton: "google" },
  generico: { texto: "No pudimos completar el ingreso. Probá de nuevo.", boton: "google" },
} as const satisfies Record<AvisoSinSesion, { texto: string; boton: "google" | "otra-cuenta" }>;

export function esAvisoSinSesion(aviso: AvisoIngreso): aviso is AvisoSinSesion {
  return aviso !== null && Object.hasOwn(AVISOS_SIN_SESION, aviso);
}

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
/**
 * Si una ruta no sirve para volver después de ingresar: /ingresar (con sesión válida se redirigiría a sí misma) o
 * algo bajo /api/ (no son páginas, y las de Auth.js vuelven a /ingresar?error=… sin `callbackUrl`). Normaliza como
 * lo haría el pedido: "." y "..", los %XX del camino (también una "/" codificada), mayúsculas, barras repetidas y
 * la final (Next la redirige). La query no cuenta; un "?", "#" o "\\" codificado en el camino, sí (se rechaza).
 */
function destinoProhibido(ruta: string): boolean {
  let camino: string;
  try {
    camino = decodeURIComponent(new URL(ruta, "http://ruta.invalid").pathname);
  } catch {
    // Un %XX inválido en el camino: no se sabe a dónde va, así que no sirve de destino.
    return true;
  }
  // Decodificado, un "?", "#" o "\\" cambiaría cómo se lee la ruta: no sirve de destino.
  if (/[?#\\]/.test(camino)) return true;
  // Sin volver a parsear (un "//" al principio se leería como otro host): segmentos, "." y "..", vacíos afuera.
  const partes: string[] = [];
  for (const segmento of camino.split("/")) {
    if (segmento === "" || segmento === ".") continue;
    if (segmento === "..") partes.pop();
    else partes.push(segmento.toLowerCase());
  }
  const normal = `/${partes.join("/")}`;
  return normal === RUTA_INGRESO || normal === "/api" || normal.startsWith("/api/");
}

/**
 * Zod: a dónde puede volver /ingresar después de ingresar. Una ruta interna (`esquemaRutaInterna`) que no sea
 * /ingresar ni esté bajo /api/ (revisión del PR #73: bucles de redirecciones con sesión válida).
 */
export const esquemaDestinoDeIngreso = esquemaRutaInterna.refine((ruta) => !destinoProhibido(ruta));

// El `callbackUrl` de la URL: un solo string y destino válido; si no, "/".
const rutaDeLaUrl = esquemaDestinoDeIngreso.catch("/");
/** Aviso para el `error` de la URL sin sesión: uno por código conocido, "generico" para el resto. */
function avisoDeError(error: unknown): AvisoIngreso {
  const leido = errorDeLaUrl.safeParse(error);
  if (!leido.success) return "generico";
  if (!leido.data) return null;
  const conocido = errorConocido.safeParse(leido.data);
  return conocido.success ? AVISO_DE_ERROR[conocido.data] : "generico";
}

/**
 * A dónde lleva /ingresar según la sesión, `error` y `callbackUrl` (ADR-002 R-5). Los dos se validan con Zod:
 * el `callbackUrl` tiene que ser un destino válido (`esquemaDestinoDeIngreso`); uno externo, a /ingresar o a
 * /api/, o repetido en la query, vuelve a "/". Con `error=sesion` o con sesión huérfana no se redirige: devolverlo a la página lo haría rebotar.
 */
export function decidirIngreso(entrada: {
  sesion: EstadoSesion;
  error?: string | string[];
  callbackUrl?: string | string[];
}): DecisionIngreso {
  // Solo el `callbackUrl` de la query, o "/". Ni `signIn` ni Auth.js lo pasan cuando mandan acá con un error:
  // ahí se vuelve a "/" (decisión de @lautioliver en el PR #73: recuperarlo de la cookie de Auth.js armaba bucles).
  const callbackUrl = rutaDeLaUrl.parse(entrada.callbackUrl);
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
