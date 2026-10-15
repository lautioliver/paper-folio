import { describe, expect, it } from "vitest";
import { projects, services } from "@/content/profile";
import {
  demoDesdePerfil,
  esUrlHttp,
  esUrlHttps,
  proyectoDesdePerfil,
  proyectoEsquema,
  servicioDesdePerfil,
  servicioEsquema,
} from "./contenido-esquemas";

describe("URLs", () => {
  it.each([
    ["https://a.example.com/x", true, true],
    ["http://a.example.com", false, true],
    ["javascript:alert(1)", false, false],
    ["data:text/html,hola", false, false],
    ["//a.example.com", false, false],
    ["a.example.com", false, false],
    ["", false, false],
  ])("%s → https: %s, http(s): %s", (url, https, http) => {
    expect(esUrlHttps(url)).toBe(https);
    expect(esUrlHttp(url)).toBe(http);
  });
});

describe("contenido desde profile.ts", () => {
  it("cada proyecto pasa con la forma del modelo, con su demo y válido para el esquema", () => {
    const [ucanode] = projects;
    expect(proyectoDesdePerfil(ucanode)).toEqual({
      slug: "ucanode",
      nombre: "UcaNode",
      inicial: "U",
      categoria: ucanode.category,
      descripcion: ucanode.description,
      stack: ucanode.stack,
      repoUrl: ucanode.repoUrl,
      acento: "terciario",
      caso: ucanode.caso,
      tieneDemo: true,
    });
    for (const project of projects) {
      expect(proyectoEsquema.safeParse(proyectoDesdePerfil(project)).success, project.slug).toBe(true);
    }
  });

  it("la demo de cada proyecto es su demoUrl, con el título que hoy tiene el iframe", () => {
    expect(demoDesdePerfil(projects[1])).toEqual({
      titulo: "Demo de NumérikaAI",
      url: "https://numerika-ai.vercel.app",
      descripcion: "",
    });
  });

  it("cada servicio pasa con su ícono", () => {
    expect(servicioDesdePerfil(services[0])).toEqual({
      titulo: "Frontend",
      descripcion: services[0].description,
      icono: "frontend",
    });
    for (const service of services) expect(servicioEsquema.safeParse(servicioDesdePerfil(service)).success).toBe(true);
  });
});
