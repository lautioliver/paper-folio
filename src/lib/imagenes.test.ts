import { describe, expect, it, vi } from "vitest";
import { LADO_MAXIMO, TAMANO_MAXIMO, subirImagen, validarImagen, type SubirBlob } from "./imagenes";

// Archivos de prueba mínimos, armados byte a byte: solo la cabecera que se lee, sin binarios en el repo.
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const be32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const be16 = (n: number) => [(n >>> 8) & 0xff, n & 0xff];
const le16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff];
const le24 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff];
const le32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

function png(ancho: number, alto: number): Uint8Array {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...be32(13), ...ascii("IHDR"), ...be32(ancho), ...be32(alto), 8, 6, 0, 0, 0,
    ...be32(0), // CRC: no se verifica
    ...be32(0), ...ascii("IEND"), ...be32(0),
  ]);
}

function jpeg(ancho: number, alto: number, sof = 0xc0): Uint8Array {
  const app0 = [0xff, 0xe0, ...be16(16), ...ascii("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sofn = [0xff, sof, ...be16(17), 8, ...be16(alto), ...be16(ancho), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return Uint8Array.from([0xff, 0xd8, ...app0, ...sofn, 0xff, 0xd9]);
}

function riff(chunk: number[]): Uint8Array {
  return Uint8Array.from([...ascii("RIFF"), ...le32(4 + chunk.length), ...ascii("WEBP"), ...chunk]);
}

function webpVp8x(ancho: number, alto: number): Uint8Array {
  return riff([...ascii("VP8X"), ...le32(10), 0, 0, 0, 0, ...le24(ancho - 1), ...le24(alto - 1)]);
}

function webpVp8l(ancho: number, alto: number): Uint8Array {
  const w = ancho - 1;
  const h = alto - 1;
  const bits = [w & 0xff, ((w >>> 8) & 0x3f) | ((h & 0x03) << 6), (h >>> 2) & 0xff, (h >>> 10) & 0x0f];
  return riff([...ascii("VP8L"), ...le32(5), 0x2f, ...bits]);
}

function webpVp8(ancho: number, alto: number): Uint8Array {
  return riff([...ascii("VP8 "), ...le32(10), 0x50, 0x02, 0x00, 0x9d, 0x01, 0x2a, ...le16(ancho), ...le16(alto)]);
}

async function bytesDe(archivo: File): Promise<Uint8Array> {
  return new Uint8Array(await archivo.arrayBuffer());
}

describe("validarImagen: formatos aceptados", () => {
  it("acepta un PNG válido y lee sus dimensiones de IHDR", () => {
    expect(validarImagen(png(640, 480))).toEqual({
      ok: true, formato: "png", contentType: "image/png", ancho: 640, alto: 480,
    });
  });

  it("acepta un JPEG válido (SOF0 y SOF2 progresivo)", () => {
    expect(validarImagen(jpeg(800, 600))).toEqual({
      ok: true, formato: "jpeg", contentType: "image/jpeg", ancho: 800, alto: 600,
    });
    expect(validarImagen(jpeg(1200, 900, 0xc2))).toMatchObject({ ok: true, ancho: 1200, alto: 900 });
  });

  it("acepta un WebP válido en sus tres variantes (VP8X, VP8L y VP8)", () => {
    expect(validarImagen(webpVp8x(1024, 768))).toEqual({
      ok: true, formato: "webp", contentType: "image/webp", ancho: 1024, alto: 768,
    });
    expect(validarImagen(webpVp8l(300, 2000))).toMatchObject({ ok: true, formato: "webp", ancho: 300, alto: 2000 });
    expect(validarImagen(webpVp8(2000, 150))).toMatchObject({ ok: true, formato: "webp", ancho: 2000, alto: 150 });
  });

  it("acepta exactamente 2 MB y 2000×2000 px", () => {
    const cabecera = png(LADO_MAXIMO, LADO_MAXIMO);
    const justo = new Uint8Array(TAMANO_MAXIMO);
    justo.set(cabecera);
    expect(validarImagen(justo)).toMatchObject({ ok: true, ancho: 2000, alto: 2000 });
  });
});

describe("validarImagen: rechazos", () => {
  it("rechaza un .jpg con MIME de imagen pero contenido de texto", async () => {
    const archivo = new File(["no soy una imagen"], "foto.jpg", { type: "image/jpeg" });
    expect(validarImagen(await bytesDe(archivo))).toMatchObject({ ok: false, motivo: "formato" });
  });

  it("rechaza un SVG aunque diga image/svg+xml", async () => {
    const svg = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>'],
      "logo.png",
      { type: "image/png" },
    );
    expect(validarImagen(await bytesDe(svg))).toMatchObject({ ok: false, motivo: "formato" });
  });

  it("rechaza un archivo de 2 MB + 1 byte aunque la cabecera sea válida", () => {
    const grande = new Uint8Array(TAMANO_MAXIMO + 1);
    grande.set(png(100, 100));
    expect(validarImagen(grande)).toMatchObject({ ok: false, motivo: "tamano" });
  });

  it("rechaza una imagen de 2001 px de ancho o de alto, en cada formato", () => {
    expect(validarImagen(png(2001, 100))).toMatchObject({ ok: false, motivo: "dimensiones" });
    expect(validarImagen(png(100, 2001))).toMatchObject({ ok: false, motivo: "dimensiones" });
    expect(validarImagen(jpeg(2001, 100))).toMatchObject({ ok: false, motivo: "dimensiones" });
    expect(validarImagen(webpVp8x(2001, 100))).toMatchObject({ ok: false, motivo: "dimensiones" });
    expect(validarImagen(webpVp8l(100, 2001))).toMatchObject({ ok: false, motivo: "dimensiones" });
    expect(validarImagen(webpVp8(2001, 100))).toMatchObject({ ok: false, motivo: "dimensiones" });
  });

  it("rechaza otros formatos (GIF) y archivos vacíos", () => {
    expect(validarImagen(Uint8Array.from(ascii("GIF89a\x01\x00\x01\x00")))).toMatchObject({ ok: false, motivo: "formato" });
    expect(validarImagen(new Uint8Array())).toMatchObject({ ok: false, motivo: "formato" });
  });

  it("rechaza cabeceras truncadas o sin dimensiones legibles", () => {
    expect(validarImagen(png(10, 10).slice(0, 20))).toMatchObject({ ok: false, motivo: "formato" });
    expect(validarImagen(png(0, 10))).toMatchObject({ ok: false, motivo: "formato" });
    // JPEG que llega al final sin un marcador SOF.
    expect(validarImagen(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0, 0, 0xff, 0xd9]))).toMatchObject({
      ok: false, motivo: "formato",
    });
    // Un RIFF que no es WEBP (por ejemplo, un WAV).
    expect(validarImagen(Uint8Array.from([...ascii("RIFF"), ...le32(4), ...ascii("WAVE")]))).toMatchObject({
      ok: false, motivo: "formato",
    });
    expect(validarImagen(webpVp8(10, 10).slice(0, 27))).toMatchObject({ ok: false, motivo: "formato" });
  });
});

describe("subirImagen", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";

  it("valida, genera el nombre en el servidor y sube con acceso público", async () => {
    const subir = vi.fn<SubirBlob>().mockResolvedValue({ url: `https://x.public.blob.vercel-storage.com/contenido/${id}.webp` });
    const resultado = await subirImagen(webpVp8x(10, 10), { subir, generarId: () => id });

    expect(resultado).toEqual({ ok: true, url: `https://x.public.blob.vercel-storage.com/contenido/${id}.webp` });
    expect(subir).toHaveBeenCalledTimes(1);
    expect(subir).toHaveBeenCalledWith(`contenido/${id}.webp`, expect.any(Uint8Array), {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
  });

  it("usa la extensión del formato real: .jpg para JPEG y .png para PNG", async () => {
    const subir = vi.fn<SubirBlob>().mockResolvedValue({ url: "https://x/y" });
    await subirImagen(jpeg(10, 10), { subir, generarId: () => id });
    await subirImagen(png(10, 10), { subir, generarId: () => id });
    expect(subir.mock.calls.map((c) => [c[0], c[2].contentType])).toEqual([
      [`contenido/${id}.jpg`, "image/jpeg"],
      [`contenido/${id}.png`, "image/png"],
    ]);
  });

  it("genera un id distinto por subida si no se inyecta", async () => {
    const subir = vi.fn<SubirBlob>().mockResolvedValue({ url: "https://x/y" });
    await subirImagen(png(10, 10), { subir });
    await subirImagen(png(10, 10), { subir });
    const [a, b] = subir.mock.calls.map((c) => c[0]);
    expect(a).toMatch(/^contenido\/[0-9a-f-]{36}\.png$/);
    expect(a).not.toBe(b);
  });

  it("si la imagen no es válida, no sube nada y devuelve el motivo", async () => {
    const subir = vi.fn<SubirBlob>();
    expect(await subirImagen(png(2001, 10), { subir })).toMatchObject({ ok: false, motivo: "dimensiones" });
    expect(await subirImagen(Uint8Array.from(ascii("<svg/>")), { subir })).toMatchObject({ ok: false, motivo: "formato" });
    expect(subir).not.toHaveBeenCalled();
  });
});
