/** Formato único de error de la API (`AGENTS.md`): `{ error: { codigo, mensaje, ...extra } }`. */
export function respuestaError(
  status: number,
  codigo: string,
  mensaje: string,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json({ error: { codigo, mensaje, ...extra } }, { status });
}

/** 503 de una configuración inválida: el mensaje no nombra variables ni valores (eso va solo al log). */
export function respuestaConfiguracionInvalida(): Response {
  return respuestaError(503, "CONFIGURACION_INVALIDA", "La configuración del servidor es inválida.");
}
