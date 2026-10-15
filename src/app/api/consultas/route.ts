import { crearConsulta } from "@/lib/consultas";
import { respuestaConfiguracionInvalida, respuestaError } from "@/lib/api-error";
import { EnvInvalidoError } from "@/lib/env";
import { leerIp } from "@/lib/ip";

export async function POST(request: Request): Promise<Response> {
  // Solo JSON: un formulario de otra página (text/plain, no-cors) no puede mandar consultas con la IP de sus visitantes.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return respuestaError(415, "TIPO_NO_SOPORTADO", "El envío tiene que ser application/json.");
  }

  // Sin IP no hay límite por visitante: se rechaza en vez de juntar a todos en un mismo balde.
  const ip = leerIp(request.headers);
  if (ip === "") return respuestaError(400, "IP_NO_DETECTADA", "No pudimos identificar tu conexión.");

  // Un cuerpo que no es JSON se trata como una consulta vacía: crearConsulta lo marca inválido.
  const cuerpo: unknown = await request.json().catch(() => undefined);

  try {
    const resultado = await crearConsulta(cuerpo, { ip });
    switch (resultado.tipo) {
      case "creada":
      case "descartada":
        return Response.json({ ok: true }, { status: 201 });
      case "invalida":
        return respuestaError(400, "CONSULTA_INVALIDA", "Revisá los datos de la consulta.", { campos: resultado.errores });
      case "limite":
        return respuestaError(429, "DEMASIADAS_CONSULTAS", "Enviaste muchas consultas. Probá de nuevo en una hora.");
    }
  } catch (e) {
    if (e instanceof EnvInvalidoError) {
      // El mensaje de leerEnv nombra las variables y nunca sus valores.
      console.error("consultas:", e.message);
      return respuestaConfiguracionInvalida();
    }
    // Solo el nombre del error: el mensaje puede traer la URI, credenciales o datos de la consulta.
    console.error("consultas: no se pudo guardar", e instanceof Error ? e.name : "desconocido");
    return respuestaError(503, "BASE_NO_DISPONIBLE", "No pudimos guardar tu consulta. Probá de nuevo más tarde.");
  }
}
