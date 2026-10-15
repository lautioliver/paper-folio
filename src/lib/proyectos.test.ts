import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { projects } from "@/content/profile";
import { buscarProyecto, rutaDemo, rutaDetalle } from "./proyectos";

describe("buscarProyecto", () => {
  it("encuentra cada proyecto por su slug", () => {
    for (const project of projects) expect(buscarProyecto(project.slug)).toBe(project);
  });

  it("un slug inexistente da undefined, también con nombres de Object.prototype", () => {
    for (const slug of ["no-existe", "", "UCANODE", "__proto__", "constructor", "toString"]) {
      expect(buscarProyecto(slug)).toBeUndefined();
    }
  });
});

describe("rutaDetalle", () => {
  it("arma /proyectos/<slug>", () => {
    expect(rutaDetalle("ucanode")).toBe("/proyectos/ucanode");
  });

  it("codifica el slug para que no cambie la ruta (? # espacios)", () => {
    expect(rutaDetalle("a?b#c d")).toBe("/proyectos/a%3Fb%23c%20d");
  });
});

describe("rutaDemo", () => {
  it("lleva al detalle, posicionado en la demo", () => {
    expect(rutaDemo("ucanode")).toBe("/proyectos/ucanode#demo");
  });
});

describe("caso de estudio", () => {
  it("cada proyecto trae problema, solución, funcionalidades y stack, con datos públicos", () => {
    for (const project of projects) {
      const { caso } = project;
      expect(caso.problema.length, project.slug).toBeGreaterThan(20);
      expect(caso.solucion.length, project.slug).toBeGreaterThan(20);
      expect(caso.funcionalidades.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(caso.stack.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(project.repoUrl, project.slug).toMatch(/^https:\/\/github\.com\/lautioliver\//);
      expect(project.demoUrl, project.slug).toMatch(/^https:\/\//);
    }
  });
});

describe("detalle protegido en el servidor", () => {
  it("la página de detalle llama a requerirSesion con su propia ruta (sin depender de proxy.ts)", () => {
    const fuente = readFileSync("src/app/(sitio)/proyectos/[slug]/page.tsx", "utf8");
    expect(fuente).toMatch(/requerirSesion\(\s*rutaDetalle\(/);
  });
});
