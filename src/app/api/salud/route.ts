import { conectar } from "@/lib/db";

export async function GET(): Promise<Response> {
  try {
    const { connection } = await conectar();
    await connection.db!.admin().ping();
    return Response.json({ ok: true });
  } catch (error) {
    // Solo el nombre del error en el log y nada en la respuesta: el mensaje puede traer la URI o credenciales.
    console.error("salud: la base no responde", error instanceof Error ? error.name : "desconocido");
    return Response.json(
      { error: { codigo: "BASE_NO_DISPONIBLE", mensaje: "La base de datos no responde." } },
      { status: 503 },
    );
  }
}
