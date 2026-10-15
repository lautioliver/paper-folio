export const TAMANO_MAXIMO = 2 * 1024 * 1024;
export const LADO_MAXIMO = 2000;

export type FormatoImagen = "png" | "jpeg" | "webp";
export type MotivoRechazo = "formato" | "tamano" | "dimensiones";

export type ValidacionImagen =
  | { ok: true; formato: FormatoImagen; contentType: string; ancho: number; alto: number }
  | { ok: false; motivo: MotivoRechazo; mensaje: string };

export type SubirBlob = (
  ruta: string,
  cuerpo: Uint8Array,
  opciones: { access: "public"; contentType: string; addRandomSuffix: false },
) => Promise<{ url: string }>;

export type ResultadoSubida = { ok: true; url: string } | { ok: false; motivo: MotivoRechazo; mensaje: string };

export function validarImagen(bytes: Uint8Array): ValidacionImagen {
  void bytes;
  return { ok: false, motivo: "formato", mensaje: "stub" };
}

export async function subirImagen(
  bytes: Uint8Array,
  dependencias: { subir?: SubirBlob; generarId?: () => string } = {},
): Promise<ResultadoSubida> {
  void bytes;
  void dependencias;
  return { ok: false, motivo: "formato", mensaje: "stub" };
}
