import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// La ruta no puede importar `@/auth` en Vitest (next-auth no resuelve next/server): se mockea el permiso.
// `@vercel/blob` también se mockea: ningún test sube a Vercel Blob real.
const requerirRol = vi.fn();
const put = vi.fn();
vi.mock("@/lib/permisos", () => ({
  requerirRol: (...args: unknown[]) => requerirRol(...args),
}));
vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => put(...args),
}));

import { POST } from "./route";

// PNG mínimo de 10×10 (firma + IHDR).
const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 10, 0, 0, 0, 10, 8, 6, 0,
  0, 0, 0, 0, 0, 0,
]);

function pedido(archivo?: Blob, nombre = "foto.png"): Request {
  const form = new FormData();
  if (archivo) form.append("archivo", archivo, nombre);
  return new Request("http://localhost:3480/api/imagenes", { method: "POST", body: form });
}

/** Lo que tira `forbidden()` de next/navigation; Next lo convierte en un 403. */
const prohibido = () => Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;403"), { digest: "NEXT_HTTP_ERROR_FALLBACK;403" });

beforeEach(() => {
  requerirRol.mockReset();
  put.mockReset();
  vi.stubEnv("BLOB_STORE_ID", "store_dePrueba123");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/imagenes: permisos", () => {
  it("exige admin, con la ruta del panel a la que volver", async () => {
    requerirRol.mockResolvedValue({ id: "1", rol: "admin" });
    put.mockResolvedValue({ url: "https://x.public.blob.vercel-storage.com/contenido/a.png" });
    await POST(pedido(new Blob([PNG])));
    expect(requerirRol).toHaveBeenCalledWith("/panel", "admin");
  });

  it("un usuario que no es admin recibe 403 y no se escribe nada en Blob", async () => {
    requerirRol.mockRejectedValue(prohibido());
    await expect(POST(pedido(new Blob([PNG])))).rejects.toThrow("403");
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza con 403 JSON un envío de otro sitio o de un subdominio (Sec-Fetch-Site), sin leer el cuerpo", async () => {
    requerirRol.mockResolvedValue({ id: "1", rol: "admin" });
    for (const sitio of ["cross-site", "same-site"]) {
      const form = new FormData();
      form.append("archivo", new Blob([PNG]), "foto.png");
      const req = new Request("http://localhost:3480/api/imagenes", {
        method: "POST",
        headers: { "sec-fetch-site": sitio },
        body: form,
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ error: { codigo: "ORIGEN_NO_PERMITIDO" } });
      expect(req.bodyUsed).toBe(false);
    }
    expect(put).not.toHaveBeenCalled();
  });

  it("acepta el envío del mismo origen (Sec-Fetch-Site: same-origin)", async () => {
    requerirRol.mockResolvedValue({ id: "1", rol: "admin" });
    put.mockResolvedValue({ url: "https://x.public.blob.vercel-storage.com/contenido/a.png" });
    const form = new FormData();
    form.append("archivo", new Blob([PNG]), "foto.png");
    const res = await POST(
      new Request("http://localhost:3480/api/imagenes", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
        body: form,
      }),
    );
    expect(res.status).toBe(201);
  });

  it("chequea el permiso antes de leer el cuerpo", async () => {
    requerirRol.mockRejectedValue(prohibido());
    const req = pedido(new Blob([PNG]));
    await expect(POST(req)).rejects.toThrow("403");
    expect(req.bodyUsed).toBe(false);
  });
});

describe("POST /api/imagenes: subida (admin)", () => {
  beforeEach(() => {
    requerirRol.mockResolvedValue({ id: "1", rol: "admin" });
  });

  it("sube una imagen válida con nombre generado y responde 201 con la URL", async () => {
    put.mockImplementation(async (ruta: string) => ({ url: `https://x.public.blob.vercel-storage.com/${ruta}` }));
    const res = await POST(pedido(new Blob([PNG], { type: "image/png" }), "../../etc/passwd.png"));

    expect(res.status).toBe(201);
    const cuerpo = (await res.json()) as { url: string };
    expect(cuerpo.url).toMatch(/^https:\/\/x\.public\.blob\.vercel-storage\.com\/contenido\/[0-9a-f-]{36}\.png$/);
    expect(put).toHaveBeenCalledTimes(1);
    const [ruta, , opciones] = put.mock.calls[0] as [string, unknown, Record<string, unknown>];
    expect(ruta).toMatch(/^contenido\/[0-9a-f-]{36}\.png$/);
    expect(opciones).toMatchObject({
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      storeId: "store_dePrueba123",
    });
  });

  it("rechaza con 400 IMAGEN_INVALIDA un archivo que no es imagen, sin subir nada", async () => {
    const res = await POST(pedido(new Blob(["<svg/>"], { type: "image/png" }), "logo.png"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { codigo: "IMAGEN_INVALIDA", motivo: "formato" } });
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza con 413 un archivo de más de 2 MB, sin subir nada", async () => {
    const grande = new Uint8Array(2 * 1024 * 1024 + 1);
    grande.set(PNG);
    const res = await POST(pedido(new Blob([grande])));
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: { codigo: "IMAGEN_INVALIDA", motivo: "tamano" } });
    expect(put).not.toHaveBeenCalled();
  });

  it("responde 400 ARCHIVO_FALTANTE si no viene el campo archivo o no es un archivo", async () => {
    expect((await POST(pedido())).status).toBe(400);
    const form = new FormData();
    form.append("archivo", "texto suelto");
    const res = await POST(new Request("http://localhost:3480/api/imagenes", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { codigo: "ARCHIVO_FALTANTE" } });
    expect(put).not.toHaveBeenCalled();
  });

  it("responde 415 si el cuerpo no es multipart/form-data, como /api/consultas", async () => {
    const res = await POST(
      new Request("http://localhost:3480/api/imagenes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(415);
    expect(await res.json()).toMatchObject({ error: { codigo: "TIPO_NO_SOPORTADO" } });
    expect(put).not.toHaveBeenCalled();
  });

  it("responde 413 sin leer el cuerpo si el Content-Length ya pasa el máximo", async () => {
    const req = new Request("http://localhost:3480/api/imagenes", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(10 * 1024 * 1024) },
      body: "--x--",
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(req.bodyUsed).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  it("responde 503 sin nombrar variables si falta BLOB_STORE_ID, sin subir nada", async () => {
    vi.stubEnv("BLOB_STORE_ID", undefined);
    const res = await POST(pedido(new Blob([PNG])));
    expect(res.status).toBe(503);
    const texto = await res.text();
    expect(texto).toContain("CONFIGURACION_INVALIDA");
    expect(texto).not.toContain("BLOB_STORE_ID");
    expect(put).not.toHaveBeenCalled();
  });

  it("responde 503 SUBIDA_FALLIDA si Vercel Blob falla, sin filtrar el mensaje", async () => {
    put.mockRejectedValue(new Error("token vercel_blob_secreto inválido"));
    const res = await POST(pedido(new Blob([PNG])));
    expect(res.status).toBe(503);
    const texto = await res.text();
    expect(texto).toContain("SUBIDA_FALLIDA");
    expect(texto).not.toContain("secreto");
  });
});
