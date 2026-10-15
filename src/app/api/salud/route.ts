import { conectar } from "@/lib/db";

export async function GET(): Promise<Response> {
  try {
    const { connection } = await conectar();
    await connection.db!.admin().ping();
    return Response.json({ ok: true });
  } catch {
    // Sin detalle del error: puede traer la URI o credenciales.
    return Response.json(
      { error: { codigo: "BASE_NO_DISPONIBLE", mensaje: "La base de datos no responde." } },
      { status: 503 },
    );
  }
}
