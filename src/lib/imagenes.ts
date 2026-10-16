import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { leerBlobConfig } from "./env";

/** Imágenes del contenido (épica #46, decisión 2): PNG, JPEG o WebP de hasta 2 MB y 2000×2000 px. */
export const TAMANO_MAXIMO = 2 * 1024 * 1024;
export const LADO_MAXIMO = 2000;

export type FormatoImagen = "png" | "jpeg" | "webp";
export type MotivoRechazo = "formato" | "tamano" | "dimensiones";

export type ValidacionImagen =
  | { ok: true; formato: FormatoImagen; contentType: string; ancho: number; alto: number }
  | { ok: false; motivo: MotivoRechazo; mensaje: string };

/** El cliente de Vercel Blob, inyectable: los tests nunca suben a Blob real. */
export type SubirBlob = (
  ruta: string,
  cuerpo: Uint8Array,
  opciones: { access: "public"; contentType: string; addRandomSuffix: false },
) => Promise<{ url: string }>;

export type ResultadoSubida = { ok: true; url: string } | { ok: false; motivo: MotivoRechazo; mensaje: string };

const FORMATOS: Record<FormatoImagen, { contentType: string; extension: string }> = {
  png: { contentType: "image/png", extension: "png" },
  jpeg: { contentType: "image/jpeg", extension: "jpg" },
  webp: { contentType: "image/webp", extension: "webp" },
};

export const MENSAJES: Record<MotivoRechazo, string> = {
  formato: "El archivo tiene que ser una imagen PNG, JPEG o WebP.",
  tamano: "La imagen no puede pesar más de 2 MB.",
  dimensiones: "La imagen no puede medir más de 2000×2000 px.",
};

const rechazo = (motivo: MotivoRechazo): ValidacionImagen => ({ ok: false, motivo, mensaje: MENSAJES[motivo] });

/**
 * Valida una imagen por su contenido: el formato sale de la firma (nunca de la extensión ni del MIME del
 * cliente) y el ancho y el alto, de la cabecera de cada formato. No decodifica la imagen.
 */
export function validarImagen(bytes: Uint8Array): ValidacionImagen {
  if (bytes.length > TAMANO_MAXIMO) return rechazo("tamano");

  const leida = leerCabecera(bytes);
  if (!leida || leida.ancho < 1 || leida.alto < 1) return rechazo("formato");
  if (leida.ancho > LADO_MAXIMO || leida.alto > LADO_MAXIMO) return rechazo("dimensiones");

  return { ok: true, formato: leida.formato, contentType: FORMATOS[leida.formato].contentType, ancho: leida.ancho, alto: leida.alto };
}

/**
 * Valida la imagen y la sube a Vercel Blob con acceso público, con un nombre que genera el servidor
 * (`contenido/<uuid>.<ext>`, la extensión del formato real). Devuelve la URL pública.
 */
export async function subirImagen(
  bytes: Uint8Array,
  dependencias: { subir?: SubirBlob; generarId?: () => string } = {},
): Promise<ResultadoSubida> {
  const validacion = validarImagen(bytes);
  if (!validacion.ok) return validacion;

  const { subir = subirAVercelBlob, generarId = randomUUID } = dependencias;
  const ruta = `contenido/${generarId()}.${FORMATOS[validacion.formato].extension}`;
  const { url } = await subir(ruta, bytes, {
    access: "public",
    contentType: validacion.contentType,
    addRandomSuffix: false,
  });
  return { ok: true, url };
}

/** Cliente real. Se autentica por OIDC: `VERCEL_OIDC_TOKEN` (lo inyecta Vercel) más `BLOB_STORE_ID`. */
const subirAVercelBlob: SubirBlob = async (ruta, cuerpo, opciones) => {
  const { BLOB_STORE_ID } = leerBlobConfig(); // tira EnvInvalidoError antes de llamar a Blob
  // Buffer: `put` acepta Buffer, Blob o streams (no un Uint8Array suelto en sus tipos).
  return put(ruta, Buffer.from(cuerpo.buffer, cuerpo.byteOffset, cuerpo.byteLength), {
    ...opciones,
    storeId: BLOB_STORE_ID,
  });
};

type Cabecera = { formato: FormatoImagen; ancho: number; alto: number };

function leerCabecera(b: Uint8Array): Cabecera | null {
  if (empiezaCon(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return leerPng(b);
  if (empiezaCon(b, [0xff, 0xd8, 0xff])) return leerJpeg(b);
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return leerWebp(b);
  return null;
}

/** PNG: el primer chunk es IHDR, con el ancho y el alto en 32 bits big endian. */
function leerPng(b: Uint8Array): Cabecera | null {
  if (b.length < 24 || ascii(b, 12, 4) !== "IHDR") return null;
  return { formato: "png", ancho: be32(b, 16), alto: be32(b, 20) };
}

// Marcadores SOFn (start of frame) que traen las dimensiones. C4 (DHT), C8 (JPG) y CC (DAC) no lo son.
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

/** JPEG: recorre los segmentos hasta el primer SOFn (`FF Cn largo(2) precisión(1) alto(2) ancho(2)`). */
function leerJpeg(b: Uint8Array): Cabecera | null {
  let i = 2;
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) return null;
    const marcador = b[i + 1];
    if (marcador === 0xff) {
      i += 1; // relleno entre segmentos
      continue;
    }
    // Marcadores sin largo: TEM y RSTn.
    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      i += 2;
      continue;
    }
    // Fin de imagen o comienzo de los datos sin haber visto un SOF.
    if (marcador === 0xd9 || marcador === 0xda || marcador === 0xd8) return null;
    if (i + 3 >= b.length) return null;
    const largo = be16(b, i + 2);
    if (largo < 2) return null;
    if (SOF.has(marcador)) {
      if (largo < 7 || i + 8 >= b.length) return null;
      return { formato: "jpeg", alto: be16(b, i + 5), ancho: be16(b, i + 7) };
    }
    i += 2 + largo;
  }
  return null;
}

/** WebP: el primer chunk después de `RIFF....WEBP` es VP8X (extendido), VP8L (sin pérdida) o `VP8 ` (con pérdida). */
function leerWebp(b: Uint8Array): Cabecera | null {
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8X") {
    // flags(1) + reservado(3), después el ancho y el alto del lienzo menos 1, en 24 bits little endian.
    if (b.length < 30) return null;
    return { formato: "webp", ancho: le24(b, 24) + 1, alto: le24(b, 27) + 1 };
  }
  if (chunk === "VP8L") {
    // Firma 0x2F y 14 bits de ancho - 1 y 14 de alto - 1, little endian.
    if (b.length < 25 || b[20] !== 0x2f) return null;
    const ancho = 1 + (b[21] | ((b[22] & 0x3f) << 8));
    const alto = 1 + ((b[22] >> 6) | (b[23] << 2) | ((b[24] & 0x0f) << 10));
    return { formato: "webp", ancho, alto };
  }
  if (chunk === "VP8 ") {
    // Frame tag(3), código de inicio 9D 01 2A y el ancho y el alto en 14 bits little endian (2 bits de escala).
    if (b.length < 30 || b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { formato: "webp", ancho: le16(b, 26) & 0x3fff, alto: le16(b, 28) & 0x3fff };
  }
  return null;
}

function empiezaCon(b: Uint8Array, firma: number[]): boolean {
  return b.length >= firma.length && firma.every((v, i) => b[i] === v);
}

function ascii(b: Uint8Array, desde: number, largo: number): string {
  if (b.length < desde + largo) return "";
  return String.fromCharCode(...b.subarray(desde, desde + largo));
}

const be16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const be32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const le16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const le24 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
