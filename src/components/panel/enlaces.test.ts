import { describe, expect, it } from "vitest";
import { enlacesPara, esActual } from "./enlaces";

describe("enlacesPara", () => {
  it("el operador ve Consultas y no Servicios ni Proyectos", () => {
    const etiquetas = enlacesPara("operador").map((e) => e.etiqueta);
    expect(etiquetas).toContain("Consultas");
    expect(etiquetas).not.toContain("Servicios");
    expect(etiquetas).not.toContain("Proyectos");
  });

  it("el admin ve Consultas, Proyectos y Servicios", () => {
    expect(enlacesPara("admin")).toEqual(
      expect.arrayContaining([
        { href: "/panel/consultas", etiqueta: "Consultas" },
        { href: "/panel/proyectos", etiqueta: "Proyectos" },
        { href: "/panel/servicios", etiqueta: "Servicios" },
      ]),
    );
  });

  it("un usuario sin rol de panel no ve ninguna sección", () => {
    expect(enlacesPara("usuario")).toEqual([]);
  });
});

describe("esActual", () => {
  it("marca la sección y sus subrutas, sin confundir prefijos", () => {
    expect(esActual("/panel/servicios", "/panel/servicios")).toBe(true);
    expect(esActual("/panel/servicios/nuevo", "/panel/servicios")).toBe(true);
    expect(esActual("/panel/consultas", "/panel/servicios")).toBe(false);
    expect(esActual("/panel/serviciosx", "/panel/servicios")).toBe(false);
    expect(esActual("/panel/proyectos/6528f0c2a1b2c3d4e5f60718", "/panel/proyectos")).toBe(true);
    expect(esActual("/panel/proyectos", "/panel/servicios")).toBe(false);
  });
});
