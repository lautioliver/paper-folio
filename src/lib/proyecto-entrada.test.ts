import { describe, expect, it } from "vitest";
import { datosDeFormulario, sugerirSlug } from "./proyecto-entrada";
import { SLUG } from "./contenido-esquemas";

describe("sugerirSlug", () => {
  it("pasa el nombre a minúsculas y guiones, sin tildes ni ñ", () => {
    expect(sugerirSlug("Árbol de Ñandú 2.0!")).toBe("arbol-de-nandu-2-0");
    expect(sugerirSlug("  UCA   Node  ")).toBe("uca-node");
    expect(sugerirSlug("¿?")).toBe("");
  });

  it("lo que sugiere siempre es un slug válido (o vacío) de hasta 80 caracteres", () => {
    for (const nombre of ["Hola", "x".repeat(200), "a — b", "C++ / C#", "über café"]) {
      const s = sugerirSlug(nombre);
      expect(s.length).toBeLessThanOrEqual(80);
      if (s) expect(s).toMatch(SLUG);
    }
  });
});

describe("datosDeFormulario", () => {
  it("arma el objeto del servicio: listas por línea (sin las vacías), publicado e imagen opcional", () => {
    const f = new FormData();
    f.set("slug", "mi-proyecto");
    f.set("nombre", "Mi proyecto");
    f.set("inicial", "M");
    f.set("categoria", "Web");
    f.set("descripcion", "Desc");
    f.set("repoUrl", "https://github.com/x/y");
    f.set("acento", "acento");
    f.set("imagen", "");
    f.set("stack", "Next.js\r\n\r\n  MongoDB  \n");
    f.set("caso.problema", "Línea 1\r\nLínea 2");
    f.set("caso.solucion", "Sol");
    f.set("caso.funcionalidades", "Una\nDos");
    f.set("caso.stack", "");
    f.set("publicado", "on");
    expect(datosDeFormulario(f)).toEqual({
      slug: "mi-proyecto",
      nombre: "Mi proyecto",
      inicial: "M",
      categoria: "Web",
      descripcion: "Desc",
      repoUrl: "https://github.com/x/y",
      acento: "acento",
      imagen: undefined,
      stack: ["Next.js", "MongoDB"],
      caso: { problema: "Línea 1\nLínea 2", solucion: "Sol", funcionalidades: ["Una", "Dos"], stack: [] },
      publicado: true,
    });
  });

  it("sin el checkbox, publicado es false; los campos que faltan quedan vacíos (y los rechaza el servicio)", () => {
    const d = datosDeFormulario(new FormData());
    expect(d.publicado).toBe(false);
    expect(d.slug).toBe("");
    expect(d.stack).toEqual([]);
  });
});
