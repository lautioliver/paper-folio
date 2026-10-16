import { describe, expect, it } from "vitest";
import { enlacesPara, esActual } from "./enlaces";

describe("enlacesPara", () => {
  it("el operador ve Consultas y no Servicios", () => {
    const etiquetas = enlacesPara("operador").map((e) => e.etiqueta);
    expect(etiquetas).toContain("Consultas");
    expect(etiquetas).not.toContain("Servicios");
  });

  it("el admin ve Consultas y Servicios", () => {
    expect(enlacesPara("admin")).toEqual(
      expect.arrayContaining([
        { href: "/panel/consultas", etiqueta: "Consultas" },
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
  });
});
