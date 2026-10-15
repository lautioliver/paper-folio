import { respuestaConfiguracionInvalida, respuestaError } from "@/lib/api-error";
import { conectar } from "@/lib/db";
import { EnvInvalidoError } from "@/lib/env";

export async function GET(): Promise<Response> {
  try {
    const { connection } = await conectar();
    await connection.db!.admin().ping();
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof EnvInvalidoError) {
      // El mensaje de leerEnv nombra las variables y nunca sus valores.
      console.error("salud:", error.message);
      return respuestaConfiguracionInvalida();
    }
    // Solo el nombre del error en el log y nada en la respuesta: el mensaje puede traer la URI o credenciales.
    console.error("salud: la base no responde", error instanceof Error ? error.name : "desconocido");
    return respuestaError(503, "BASE_NO_DISPONIBLE", "La base de datos no responde.");
  }
}
