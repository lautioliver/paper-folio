import { createHash } from "node:crypto";
import { z } from "zod";
import { VisitaDiaria } from "@/models/VisitaDiaria";
import { VisitanteDiario } from "@/models/VisitanteDiario";
import { listarProyectos } from "./contenido";
import { asegurarIndicesDe, conectar } from "./db";
import { fechaDeMetrica } from "./fecha-metricas";

export type DatosVisita = {
  /** Ruta de la página, como la manda el navegador (se normaliza acá). */
  ruta: string;
  /** Id anónimo de la cookie `pf_v`. Solo se guarda `sha256(id + fecha)`. */
  visitanteId: string;
  userAgent: string;
  esAdmin: boolean;
};
export type ResultadoVisita = "contada" | "descartada";

/** Clave de las visitas a rutas que no son del sitio (un slug que no existe, un 404). */
export const RUTA_OTRA = "otra";

// Las páginas fijas del grupo `(sitio)`. Una página pública nueva se suma acá para contarse con su ruta (un test
// compara esta lista con los `page.tsx` de `src/app/(sitio)`).
export const RUTAS_FIJAS: ReadonlySet<string> = new Set(["/", "/proyectos", "/cuenta"]);
const DETALLE = /^\/proyectos\/([a-z0-9-]+)$/;

/**
 * La clave con que se cuenta una ruta ya normalizada: las fijas y `/proyectos/<slug>` de un proyecto publicado
 * van tal cual, y cualquier otra a `RUTA_OTRA`. Así `visitas_diarias` tiene a lo sumo una ruta por página real
 * por día. Los slugs salen de `listarProyectos` (cacheado con `use cache`; si la base falla, del respaldo).
 */
async function claveDeRuta(ruta: string): Promise<string> {
  if (RUTAS_FIJAS.has(ruta)) return ruta;
  const slug = DETALLE.exec(ruta)?.[1];
  if (slug && (await listarProyectos()).some((p) => p.slug === slug)) return ruta;
  return RUTA_OTRA;
}

const LARGO_MAXIMO = 200;
// Segmentos en minúsculas, números y guiones (como los slugs): sin `..`, sin `//`, sin esquemas ni hosts.
const RUTA_INTERNA = /^\/(?:[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)?$/;

/** Sin query ni hash, y sin la barra final (salvo `/`). `/proyectos/<slug>` queda tal cual. */
export function normalizarRuta(ruta: string): string {
  const sinQuery = ruta.split(/[?#]/, 1)[0];
  const sinBarra = sinQuery.replace(/\/+$/, "");
  return sinBarra === "" ? "/" : sinBarra;
}

/** Cuerpo de `POST /api/visitas`: una ruta interna del sitio, ya normalizada. */
export const esquemaVisita = z.object({
  ruta: z
    .string()
    .max(LARGO_MAXIMO)
    .refine((r) => r.startsWith("/") && !r.startsWith("//"))
    .transform(normalizarRuta)
    .pipe(z.string().regex(RUTA_INTERNA)),
});

// Crawlers, previews de links (redes y mensajería), navegadores sin interfaz y clientes HTTP de consola.
const PATRONES_BOT =
  /bot\b|bot\/|bot-|crawl|spider|slurp|archiver|facebookexternalhit|embedly|^whatsapp\/|preview|headless|lighthouse|pagespeed|phantomjs|puppeteer|playwright|selenium|curl\/|wget\/|python-|node-fetch|axios\/|okhttp|go-http-client|java\/|libwww|httpclient|scrapy/i;

/** Un user-agent vacío también es un bot: los navegadores siempre lo mandan. */
export function esBot(userAgent: string): boolean {
  const ua = userAgent.trim();
  return ua === "" || PATRONES_BOT.test(ua);
}

/** Rutas que no son del sitio público: el panel y la API. */
function esRutaExcluida(ruta: string): boolean {
  return /^\/(?:panel|api)(?:\/|$)/.test(ruta);
}

/**
 * Si la visita se descarta sin mirar quién es: un bot o una ruta del panel o de la API. La ruta lo usa para
 * no leer la sesión (ni la base) en esos pedidos.
 */
export function seDescartaSinSesion(ruta: string, userAgent: string): boolean {
  return esBot(userAgent) || esRutaExcluida(normalizarRuta(ruta));
}

/** El día de la visita en America/Argentina/Salta, como `YYYY-MM-DD` (`fechaDeMetrica`). */
export function fechaDeVisita(ahora: Date): string {
  return fechaDeMetrica(ahora);
}

function esClaveDuplicada(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

/**
 * Cuenta una carga de una página pública (épica #53, decisiones 1 y 2): `$inc` atómico con upsert en
 * `visitas_diarias` (con la clave de `claveDeRuta`) y un insert idempotente en `visitantes_diarios`. No cuentan los bots, el panel, la API
 * ni los admin. Si la base falla, tira: quien llama decide (la ruta responde 204 igual).
 */
export async function registrarVisita(datos: DatosVisita, ahora: Date = new Date()): Promise<ResultadoVisita> {
  const ruta = normalizarRuta(datos.ruta);
  if (datos.esAdmin || seDescartaSinSesion(ruta, datos.userAgent)) return "descartada";

  const fecha = fechaDeVisita(ahora);
  const idHash = createHash("sha256")
    .update(datos.visitanteId + fecha)
    .digest("hex");

  await conectar();
  // Sin el índice único, el upsert podría duplicar el contador del día: si no se puede crear, no se cuenta.
  const [clave] = await Promise.all([
    claveDeRuta(ruta),
    asegurarIndicesDe(VisitaDiaria),
    asegurarIndicesDe(VisitanteDiario),
  ]);
  await Promise.all([
    VisitaDiaria.updateOne({ fecha, ruta: clave }, { $inc: { total: 1 } }, { upsert: true }),
    VisitanteDiario.create({ fecha, idHash }).catch((error: unknown) => {
      // Ya vino hoy: el índice único `{ fecha, idHash }` hace que el segundo insert choque y se ignore.
      if (!esClaveDuplicada(error)) throw error;
    }),
  ]);
  return "contada";
}
