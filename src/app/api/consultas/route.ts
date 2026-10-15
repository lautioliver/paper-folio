import { crearConsulta } from "@/lib/consultas";
import { EnvInvalidoError } from "@/lib/env";
import { leerIp } from "@/lib/ip";

function error(status: number, codigo: string, mensaje: string, extra: Record<string, unknown> = {}): Response {
  return Response.json({ error: { codigo, mensaje, ...extra } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  // Sin IP no hay límite por visitante: se rechaza en vez de juntar a todos en un mismo balde.
  const ip = leerIp(request.headers);
  if (ip === "") return error(400, "IP_NO_DETECTADA", "No pudimos identificar tu conexión.");

  // Un cuerpo que no es JSON se trata como una consulta vacía: crearConsulta lo marca inválido.
  const cuerpo: unknown = await request.json().catch(() => undefined);

  try {
    const resultado = await crearConsulta(cuerpo, { ip });
    switch (resultado.tipo) {
      case "creada":
      case "descartada":
        return Response.json({ ok: true }, { status: 201 });
      case "invalida":
        return error(400, "CONSULTA_INVALIDA", "Revisá los datos de la consulta.", { campos: resultado.errores });
      case "limite":
        return error(429, "DEMASIADAS_CONSULTAS", "Enviaste muchas consultas. Probá de nuevo en una hora.");
    }
  } catch (e) {
    if (e instanceof EnvInvalidoError) {
      // El mensaje de leerEnv nombra las variables y nunca sus valores.
      console.error("consultas:", e.message);
      return error(503, "CONFIGURACION_INVALIDA", "La configuración del servidor es inválida.");
    }
    // Solo el nombre del error: el mensaje puede traer la URI, credenciales o datos de la consulta.
    console.error("consultas: no se pudo guardar", e instanceof Error ? e.name : "desconocido");
    return error(503, "BASE_NO_DISPONIBLE", "No pudimos guardar tu consulta. Probá de nuevo más tarde.");
  }
}
