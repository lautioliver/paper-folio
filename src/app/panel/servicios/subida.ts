export type ResultadoSubida = { ok: true; url: string } | { ok: false; mensaje: string };

const ERROR_GENERICO = "No pudimos subir la imagen. Probá de nuevo.";

/**
 * Sube una imagen con `POST /api/imagenes` (solo admin; valida firma, tamaño y dimensiones en el servidor)
 * y devuelve su URL o el mensaje del servidor. No lanza: un error de red también vuelve como mensaje.
 */
export async function subirImagenDelPanel(archivo: File, f: typeof fetch = fetch): Promise<ResultadoSubida> {
  const cuerpo = new FormData();
  cuerpo.set("archivo", archivo);
  try {
    const res = await f("/api/imagenes", { method: "POST", body: cuerpo });
    const json: unknown = await res.json().catch(() => null);
    if (res.ok && typeof (json as { url?: unknown })?.url === "string") {
      return { ok: true, url: (json as { url: string }).url };
    }
    const mensaje = (json as { error?: { mensaje?: unknown } } | null)?.error?.mensaje;
    return { ok: false, mensaje: typeof mensaje === "string" ? mensaje : ERROR_GENERICO };
  } catch {
    return { ok: false, mensaje: ERROR_GENERICO };
  }
}
