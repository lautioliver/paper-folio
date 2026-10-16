import { randomUUID } from "node:crypto";
import { z } from "zod";
import { respuestaError } from "@/lib/api-error";
import { rolDeLaSesion } from "@/lib/sesion";
import { esquemaVisita, registrarVisita } from "@/lib/visitas";

/** Cookie anónima del visitante (épica #53, decisión 2): un id al azar, sin datos de la persona. */
const COOKIE = "pf_v";
const UN_ANO_S = 365 * 24 * 60 * 60;
const idValido = z.uuid();

function leerCookie(cabecera: string | null, nombre: string): string | undefined {
  for (const par of cabecera?.split(";") ?? []) {
    const [clave, ...valor] = par.trim().split("=");
    if (clave === nombre) return valor.join("=");
  }
  return undefined;
}

function cabeceraCookie(id: string): string {
  // HttpOnly: el JS de la página no la necesita. Lax: viaja al llegar desde un link de otro sitio.
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${id}; Path=/; Max-Age=${UN_ANO_S}; HttpOnly; SameSite=Lax${secure}`;
}

/**
 * Registra una carga de una página pública. La llama `ContadorVisitas` desde el navegador, así el prerender
 * y los prefetch no cuentan. Siempre 204 salvo un pedido mal formado: contar nunca puede romper la navegación.
 */
export async function POST(request: Request): Promise<Response> {
  // Solo JSON: un formulario de otro sitio (text/plain, no-cors) no puede sumar visitas con la cookie de sus visitantes.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return respuestaError(415, "TIPO_NO_SOPORTADO", "El envío tiene que ser application/json.");
  }
  const cuerpo: unknown = await request.json().catch(() => undefined);
  const visita = esquemaVisita.safeParse(cuerpo);
  if (!visita.success) return respuestaError(400, "VISITA_INVALIDA", "La ruta de la visita no es válida.");

  const actual = leerCookie(request.headers.get("cookie"), COOKIE);
  const visitanteId = actual && idValido.safeParse(actual).success ? actual : randomUUID();

  try {
    await registrarVisita({
      ruta: visita.data.ruta,
      visitanteId,
      userAgent: request.headers.get("user-agent") ?? "",
      esAdmin: (await rolDeLaSesion()) === "admin",
    });
  } catch (error) {
    // Solo el nombre del error: el mensaje puede traer la URI de la base o credenciales.
    console.error("visitas: no se pudo registrar", error instanceof Error ? error.name : "desconocido");
  }

  const headers = new Headers({ "cache-control": "no-store" });
  if (visitanteId !== actual) headers.append("set-cookie", cabeceraCookie(visitanteId));
  return new Response(null, { status: 204, headers });
}
