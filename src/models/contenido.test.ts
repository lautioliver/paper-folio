import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { Demo } from "./Demo";
import { Proyecto } from "./Proyecto";
import { Servicio } from "./Servicio";

// Validación de los modelos sin base: `validate()` corre los validadores de Mongoose en memoria.
const proyectoValido = {
  slug: "mi-proyecto",
  nombre: "Mi proyecto",
  inicial: "M",
  categoria: "Web",
  descripcion: "Descripción",
  stack: ["Next.js"],
  repoUrl: "https://github.com/lautioliver/mi-proyecto",
  acento: "primario",
  caso: { problema: "P", solucion: "S", funcionalidades: ["F"], stack: ["TS"] },
};

async function errores(doc: mongoose.Document): Promise<string[]> {
  try {
    await doc.validate();
    return [];
  } catch (error) {
    return Object.keys((error as mongoose.Error.ValidationError).errors);
  }
}

describe("Proyecto", () => {
  it("un proyecto válido pasa, sin publicar y con orden 0 por defecto", async () => {
    const doc = new Proyecto(proyectoValido);
    expect(await errores(doc)).toEqual([]);
    expect(doc.publicado).toBe(false);
    expect(doc.orden).toBe(0);
  });

  it.each([
    ["slug", { slug: "Con Espacios" }],
    ["acento", { acento: "rojo" }],
    ["repoUrl", { repoUrl: "javascript:alert(1)" }],
    ["repoUrl", { repoUrl: "http://github.com/x" }],
    ["imagen", { imagen: "http://example.com/a.png" }],
    ["imagen", { imagen: "data:image/png;base64,AAAA" }],
  ])("rechaza %s inválido (%j)", async (campo, cambio) => {
    expect(await errores(new Proyecto({ ...proyectoValido, ...cambio }))).toContain(campo);
  });

  it("la imagen es opcional y, si está, es una URL https", async () => {
    expect(await errores(new Proyecto({ ...proyectoValido, imagen: "https://x.public.blob.vercel-storage.com/a.webp" }))).toEqual([]);
  });
});

describe("Demo", () => {
  const base = { proyecto: new mongoose.Types.ObjectId(), titulo: "Demo", url: "https://demo.example.com" };

  it("una demo válida pasa y queda activa por defecto", async () => {
    const doc = new Demo(base);
    expect(await errores(doc)).toEqual([]);
    expect(doc.activa).toBe(true);
    expect(await errores(new Demo({ ...base, url: "http://localhost:3470" }))).toEqual([]);
  });

  it.each(["javascript:alert(1)", "ftp://demo.example.com", "data:text/html,hola", "demo.example.com"])(
    "rechaza la url %s",
    async (url) => {
      expect(await errores(new Demo({ ...base, url }))).toContain("url");
    },
  );
});

describe("Servicio", () => {
  const base = { titulo: "Frontend", descripcion: "Interfaces" };

  it("acepta un ícono de los actuales o una imagen https", async () => {
    expect(await errores(new Servicio({ ...base, icono: "frontend" }))).toEqual([]);
    expect(await errores(new Servicio({ ...base, imagen: "https://example.com/a.png" }))).toEqual([]);
  });

  it("rechaza un ícono desconocido, una imagen no https o que no tenga ni ícono ni imagen", async () => {
    expect(await errores(new Servicio({ ...base, icono: "cohete" }))).toContain("icono");
    expect(await errores(new Servicio({ ...base, imagen: "http://example.com/a.png" }))).toContain("imagen");
    expect(await errores(new Servicio(base))).toContain("icono");
  });
});
