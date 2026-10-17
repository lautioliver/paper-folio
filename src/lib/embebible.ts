import { cacheLife, cacheTag } from "next/cache";
import { TAG_CONTENIDO } from "./contenido";

// ¿La demo se deja mostrar en un iframe de este sitio? (#61). El servidor pide las cabeceras de la URL
// (X-Frame-Options y la CSP frame-ancestors) y las interpreta como un navegador. Si la demo no se deja embeber,
// el detalle muestra solo el botón "Abrir demo" en vez de un recuadro vacío.
//
// Es un pedido del servidor a una URL que carga un admin, así que se acota: solo https al puerto por defecto,
// sin credenciales en la URL, sin IPs, localhost ni nombres sin punto, GET sin leer el cuerpo con un límite de
// tiempo y redirects seguidos a mano, con las mismas reglas en cada salto. Del pedido solo se guardan (en la
// caché, por URL) el origen final y las dos cabeceras de embebido; el usuario solo ve si/no. Límite: no se
// resuelve el DNS, así que un nombre público que apunta a una IP interna pasa. Lo acota que la URL la carga un
// admin y que la respuesta no se muestra.

/** `si`/`no`: lo dicen las cabeceras. `desconocido`: no se pudo consultar (se muestra el iframe con el aviso). */
export type Embebible = "si" | "no" | "desconocido";

const TIMEOUT_MS = 3000;
const MAX_REDIRECTS = 3;
const ORIGEN_DESARROLLO = "http://localhost:3000";

/** Origen configurado del sitio: el dominio de producción en Vercel, o el de desarrollo. */
export function origenDelSitio(env: Record<string, string | undefined> = process.env): string {
  const dominio = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!dominio) return ORIGEN_DESARROLLO;
  try {
    return new URL(`https://${dominio}`).origin;
  } catch {
    return ORIGEN_DESARROLLO;
  }
}

const HOST = /^[a-z0-9.-]+(?::\d{1,5})?$/i;
const LOCAL = /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i;

/**
 * Origen con que llegó el pedido (un preview, otro dominio, otro puerto): es el que el navegador va a usar para
 * el iframe. En Vercel, `x-forwarded-host` y `x-forwarded-proto` los pone la plataforma. Un host que no es un
 * host cae en `origenDelSitio`. Un host falseado solo cambia lo que ve quien lo manda.
 */
export function origenDelPedido(cabeceras: Headers, env: Record<string, string | undefined> = process.env): string {
  const host = (cabeceras.get("x-forwarded-host") ?? cabeceras.get("host"))?.split(",")[0].trim();
  if (!host || !HOST.test(host)) return origenDelSitio(env);
  const reenviado = cabeceras.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase();
  const protocolo = reenviado === "http" || reenviado === "https" ? reenviado : LOCAL.test(host) ? "http" : "https";
  return URL.parse(`${protocolo}://${host}`)?.origin ?? origenDelSitio(env); // un puerto fuera de rango
}

function puertoEfectivo(url: URL): string {
  if (url.port) return url.port;
  return url.protocol === "https:" ? "443" : url.protocol === "http:" ? "80" : "";
}

/** Un esquema de una fuente coincide con el del sitio; `http` también acepta `https` (como los navegadores). */
function esquemaCoincide(esquema: string, sitio: URL): boolean {
  return esquema === sitio.protocol || (esquema === "http:" && sitio.protocol === "https:");
}

const FUENTE_ESQUEMA = /^[a-z][a-z0-9+.-]*:$/;
const FUENTE_HOST = /^(?:([a-z][a-z0-9+.-]*:)\/\/)?(\*|(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d+|\*))?(\/.*)?$/;

/** ¿La fuente de frame-ancestors (en minúsculas) deja que el sitio embeba la demo? */
function fuenteCoincide(fuente: string, sitio: URL, demo: URL): boolean {
  if (fuente === "*") return sitio.protocol === "https:" || sitio.protocol === "http:";
  if (fuente === "'self'") return sitio.origin === demo.origin;
  if (FUENTE_ESQUEMA.test(fuente)) return esquemaCoincide(fuente, sitio);
  const partes = FUENTE_HOST.exec(fuente);
  if (!partes) return false; // 'none', nonces y lo que no aplica a frame-ancestors
  const [, esquema, host, puerto, ruta] = partes;
  // Chromium compara la ruta de la fuente contra el origen del sitio, cuya ruta es `/`: cualquier otra ruta no
  // coincide (bloquea `https://sitio/proyectos/` aunque la página esté en /proyectos/x). Firefox ignora la ruta;
  // seguir a Chromium es el lado seguro: a lo sumo se ve el botón donde el iframe habría andado en Firefox.
  if (ruta !== undefined && ruta !== "/") return false;
  // Sin esquema vale el de la demo (y una demo http también acepta un sitio https).
  if (!esquemaCoincide(esquema ?? demo.protocol, sitio)) return false;
  const hostSitio = sitio.hostname;
  if (host.startsWith("*.")) {
    if (!hostSitio.endsWith(host.slice(1))) return false;
  } else if (host !== "*" && host !== hostSitio) {
    return false;
  }
  if (puerto === "*") return true;
  if (puerto === undefined) return sitio.port === "";
  return puerto === puertoEfectivo(sitio);
}

/**
 * Las directivas frame-ancestors de cada política aplicada (no las Report-Only). Varias cabeceras llegan unidas
 * con comas, y la coma también separa políticas: todas tienen que dejar embeber. De cada política cuenta la
 * primera frame-ancestors; `null` si ninguna la tiene.
 */
function frameAncestors(cabeceras: Headers): string[][] | null {
  const valor = cabeceras.get("content-security-policy");
  if (valor === null) return null;
  const directivas: string[][] = [];
  for (const politica of valor.split(",")) {
    for (const directiva of politica.split(";")) {
      const [nombre, ...fuentes] = directiva.trim().toLowerCase().split(/\s+/);
      if (nombre === "frame-ancestors") {
        directivas.push(fuentes);
        break;
      }
    }
  }
  return directivas.length > 0 ? directivas : null;
}

/**
 * ¿Las cabeceras de la demo dejan que `origenSitio` la muestre en un iframe? Sigue el orden de los navegadores
 * (HTML, "X-Frame-Options"): si hay frame-ancestors, manda y X-Frame-Options se ignora.
 */
export function permiteEmbeber(cabeceras: Headers, origenSitio: string, urlDemo: string): boolean {
  const sitio = new URL(origenSitio);
  const demo = new URL(urlDemo);

  const politicas = frameAncestors(cabeceras);
  if (politicas) return politicas.every((fuentes) => fuentes.some((f) => fuenteCoincide(f, sitio, demo)));

  const valores = new Set(
    (cabeceras.get("x-frame-options") ?? "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v !== ""),
  );
  if (valores.size > 1) return !["deny", "sameorigin", "allowall"].some((v) => valores.has(v));
  if (valores.has("deny")) return false;
  if (valores.has("sameorigin")) return sitio.origin === demo.origin;
  return true;
}

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const HOSTS_LOCALES = /(?:^|\.)(?:localhost|local|internal)$/;

/** La URL, si se puede consultar: https, puerto por defecto, sin credenciales y con un nombre de host público. */
function urlConsultable(valor: string | URL): URL | null {
  const url = URL.parse(valor);
  if (!url) return null;
  if (url.protocol !== "https:" || url.port !== "" || url.username !== "" || url.password !== "") return null;
  const host = url.hostname.replace(/\.$/, "");
  // Sin punto (`metadata`, `intranet`): un nombre de red interna, no un sitio público.
  if (!host.includes(".") || host.startsWith("[") || IPV4.test(host) || HOSTS_LOCALES.test(host)) return null;
  return url;
}

function nombreDe(error: unknown): string {
  return error instanceof Error ? error.name : "error";
}

/**
 * Pide la página como la va a pedir el iframe (GET de HTML: hay servidores que solo mandan la CSP ahí) y corta
 * el cuerpo sin leerlo: alcanza con las cabeceras.
 */
async function pedirCabeceras(f: typeof fetch, url: URL, signal: AbortSignal): Promise<Response> {
  const respuesta = await f(url.href, {
    method: "GET",
    headers: { accept: "text/html" },
    redirect: "manual",
    credentials: "omit",
    signal,
  });
  await respuesta.body?.cancel();
  return respuesta;
}

/** Lo que hace falta para decidir, en datos planos (lo guarda `use cache`): el origen final y las dos cabeceras. */
export type CabecerasDemo = { url: string; xFrameOptions: string | null; contentSecurityPolicy: string | null };

/**
 * Pide la demo y devuelve sus cabeceras de embebido (con `fetch` inyectable para los tests). Nunca falla: si la
 * URL no se puede consultar, la consulta falla, tarda más de `timeoutMs` o la respuesta final no es 2xx,
 * devuelve `null`. Del error se loguea solo el origen y el nombre del error: ni la ruta ni la query, que
 * podrían llevar algo privado.
 */
export async function consultarCabeceras(
  url: string,
  { fetch: f = fetch, timeoutMs = TIMEOUT_MS }: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<CabecerasDemo | null> {
  let actual = urlConsultable(url);
  if (!actual) return null;
  const origen = actual.origin;
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    for (let saltos = 0; saltos <= MAX_REDIRECTS; saltos++) {
      const respuesta = await pedirCabeceras(f, actual, signal);
      if (respuesta.status >= 200 && respuesta.status < 300) {
        return {
          // Solo el origen: alcanza para decidir y no guarda la ruta ni la query de un redirect.
          url: actual.origin,
          xFrameOptions: respuesta.headers.get("x-frame-options"),
          contentSecurityPolicy: respuesta.headers.get("content-security-policy"),
        };
      }
      // Un error o un desafío anti-bots no dice qué recibe el navegador: no se decide con eso.
      if (respuesta.status < 300 || respuesta.status >= 400) return null;
      const destino = respuesta.headers.get("location");
      const siguiente: URL | null = destino === null ? null : URL.parse(destino, actual);
      actual = siguiente && urlConsultable(siguiente);
      if (!actual) return null;
    }
    return null;
  } catch (error) {
    console.warn(`demos: no se pudo comprobar si ${origen} se deja embeber (${nombreDe(error)})`);
    return null;
  }
}

/** Decide con las cabeceras (ya cacheadas o recién pedidas) para el origen del sitio. */
function evaluar(cabeceras: CabecerasDemo | null, origenSitio: string): Embebible {
  if (!cabeceras) return "desconocido";
  const h = new Headers();
  if (cabeceras.xFrameOptions !== null) h.set("x-frame-options", cabeceras.xFrameOptions);
  if (cabeceras.contentSecurityPolicy !== null) h.set("content-security-policy", cabeceras.contentSecurityPolicy);
  return permiteEmbeber(h, origenSitio, cabeceras.url) ? "si" : "no";
}

/** `consultarCabeceras` y la decisión, sin caché. */
export async function consultarEmbebible(
  url: string,
  origenSitio: string,
  opciones: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<Embebible> {
  return evaluar(await consultarCabeceras(url, opciones), origenSitio);
}

/**
 * `consultarCabeceras` cacheada con la URL como única clave: un pedido externo por demo, no por visita ni por
 * origen (un preview o un host falseado no crean entradas nuevas). Dura horas; si no se pudo saber, minutos. Va
 * con el tag del contenido, así un cambio desde el panel también la recalcula (y una URL nueva es otra entrada).
 */
export async function cabecerasDeDemo(url: string): Promise<CabecerasDemo | null> {
  "use cache";
  cacheTag(TAG_CONTENIDO);
  const cabeceras = await consultarCabeceras(url);
  if (cabeceras === null) cacheLife("minutes");
  else cacheLife("hours");
  return cabeceras;
}

/** ¿La demo se deja embeber desde `origenSitio`? Las cabeceras salen de la caché; la decisión, afuera. */
export async function demoEmbebible(url: string, origenSitio: string): Promise<Embebible> {
  // La URL normalizada como clave: `https://x.app` y `https://X.app/` son la misma entrada y el mismo pedido.
  return evaluar(await cabecerasDeDemo(URL.parse(url)?.href ?? url), origenSitio);
}
