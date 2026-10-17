import { cacheLife, cacheTag } from "next/cache";
import { TAG_CONTENIDO } from "./contenido";

// ¿La demo se deja mostrar en un iframe de este sitio? (#61). El servidor pide las cabeceras de la URL
// (X-Frame-Options y la CSP frame-ancestors) y las interpreta como un navegador. Si la demo no se deja embeber,
// el detalle muestra solo el botón "Abrir demo" en vez de un recuadro vacío.
//
// Es un pedido del servidor a una URL que carga un admin, así que se acota: solo https al puerto por defecto,
// sin credenciales en la URL, sin IPs ni localhost, HEAD (o GET sin leer el cuerpo) con un límite de tiempo y
// redirects seguidos a mano, con las mismas reglas en cada salto. Lo único que sale del pedido es si/no.

/** `si`/`no`: lo dicen las cabeceras. `desconocido`: no se pudo consultar (se muestra el iframe con el aviso). */
export type Embebible = "si" | "no" | "desconocido";

const TIMEOUT_MS = 3000;
const MAX_REDIRECTS = 3;
const ORIGEN_DESARROLLO = "http://localhost:3000";

/** Origen con que el navegador va a pedir el iframe: el dominio de producción en Vercel, o el de desarrollo. */
export function origenDelSitio(env: Record<string, string | undefined> = process.env): string {
  const dominio = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!dominio) return ORIGEN_DESARROLLO;
  try {
    return new URL(`https://${dominio}`).origin;
  } catch {
    return ORIGEN_DESARROLLO;
  }
}

export function origenDelPedido(_cabeceras: Headers, env: Record<string, string | undefined> = process.env): string {
  return origenDelSitio(env);
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
const FUENTE_HOST = /^(?:([a-z][a-z0-9+.-]*:)\/\/)?(\*|(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d+|\*))?(?:\/.*)?$/;

/** ¿La fuente de frame-ancestors (en minúsculas) deja que el sitio embeba la demo? */
function fuenteCoincide(fuente: string, sitio: URL, demo: URL): boolean {
  if (fuente === "*") return sitio.protocol === "https:" || sitio.protocol === "http:";
  if (fuente === "'self'") return sitio.origin === demo.origin;
  if (FUENTE_ESQUEMA.test(fuente)) return esquemaCoincide(fuente, sitio);
  const partes = FUENTE_HOST.exec(fuente);
  if (!partes) return false; // 'none', nonces y lo que no aplica a frame-ancestors
  const [, esquema, host, puerto] = partes;
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
  if (host.startsWith("[") || IPV4.test(host) || HOSTS_LOCALES.test(host)) return null;
  return url;
}

function nombreDe(error: unknown): string {
  return error instanceof Error ? error.name : "error";
}

async function pedirCabeceras(f: typeof fetch, url: URL, signal: AbortSignal): Promise<Response> {
  const init = { redirect: "manual", credentials: "omit", signal } as const;
  const head = await f(url.href, { ...init, method: "HEAD" });
  await head.body?.cancel();
  if (head.status !== 405 && head.status !== 501) return head;
  // Hay servidores que no aceptan HEAD: GET, pero sin leer el cuerpo.
  const get = await f(url.href, { ...init, method: "GET" });
  await get.body?.cancel();
  return get;
}

/**
 * Consulta las cabeceras de la demo (con `fetch` inyectable para los tests). Nunca falla: si la URL no se puede
 * consultar, la consulta falla o tarda más de `timeoutMs`, devuelve `desconocido`. Del error se loguea solo el
 * origen y el nombre del error: ni la ruta ni la query, que podrían llevar algo privado.
 */
export async function consultarEmbebible(
  url: string,
  origenSitio: string,
  { fetch: f = fetch, timeoutMs = TIMEOUT_MS }: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<Embebible> {
  let actual = urlConsultable(url);
  if (!actual) return "desconocido";
  const origen = actual.origin;
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    for (let saltos = 0; saltos <= MAX_REDIRECTS; saltos++) {
      const respuesta = await pedirCabeceras(f, actual, signal);
      if (respuesta.status < 300 || respuesta.status >= 400) {
        return permiteEmbeber(respuesta.headers, origenSitio, actual.href) ? "si" : "no";
      }
      const destino = respuesta.headers.get("location");
      const siguiente: URL | null = destino === null ? null : URL.parse(destino, actual);
      actual = siguiente && urlConsultable(siguiente);
      if (!actual) return "desconocido";
    }
    return "desconocido";
  } catch (error) {
    console.warn(`demos: no se pudo comprobar si ${origen} se deja embeber (${nombreDe(error)})`);
    return "desconocido";
  }
}

/**
 * `consultarEmbebible` cacheada: un pedido externo por URL, no por visita. El resultado dura horas; si no se
 * pudo saber, minutos. Va con el tag del contenido, así un cambio desde el panel también la recalcula (y una
 * URL nueva es otra entrada de la caché).
 */
export async function demoEmbebible(url: string, origenSitio: string): Promise<Embebible> {
  "use cache";
  cacheTag(TAG_CONTENIDO);
  const resultado = await consultarEmbebible(url, origenSitio);
  if (resultado === "desconocido") cacheLife("minutes");
  else cacheLife("hours");
  return resultado;
}
