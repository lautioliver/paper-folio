import { describe, expect, it } from "vitest";
import { enlacesPara } from "./enlaces";

const etiquetas = (rol: Parameters<typeof enlacesPara>[0]) => enlacesPara(rol).map((e) => e.etiqueta);

describe("enlacesPara: el menú del panel según el rol", () => {
  it("el admin ve Consultas y Proyectos", () => {
    expect(etiquetas("admin")).toEqual(expect.arrayContaining(["Consultas", "Proyectos"]));
  });

  it("el operador ve Consultas y no ve Proyectos", () => {
    expect(etiquetas("operador")).toContain("Consultas");
    expect(etiquetas("operador")).not.toContain("Proyectos");
  });

  it("un usuario no ve ninguna sección", () => {
    expect(enlacesPara("usuario")).toEqual([]);
  });
});
