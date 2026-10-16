import { describe, expect, it, vi } from "vitest";
import { subirImagenDelPanel } from "./subida";

const archivo = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });

describe("subirImagenDelPanel", () => {
  it("manda el archivo en el campo archivo a /api/imagenes y devuelve la URL", async () => {
    const f = vi.fn(async () => Response.json({ url: "https://blob.example/x.png" }, { status: 201 }));
    expect(await subirImagenDelPanel(archivo, f)).toEqual({ ok: true, url: "https://blob.example/x.png" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/imagenes");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("archivo")).toBeInstanceOf(File);
  });

  it("con un error de la API devuelve su mensaje", async () => {
    const f = vi.fn(async () =>
      Response.json({ error: { codigo: "IMAGEN_INVALIDA", mensaje: "La imagen pesa más de 2 MB." } }, { status: 413 }),
    );
    expect(await subirImagenDelPanel(archivo, f)).toEqual({ ok: false, mensaje: "La imagen pesa más de 2 MB." });
  });

  it("con un error de red o una respuesta rara devuelve un mensaje genérico, sin lanzar", async () => {
    const red = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await subirImagenDelPanel(archivo, red)).toMatchObject({ ok: false });
    const html = vi.fn(async () => new Response("<html>", { status: 500 }));
    expect(await subirImagenDelPanel(archivo, html)).toMatchObject({ ok: false, mensaje: expect.any(String) });
  });
});
