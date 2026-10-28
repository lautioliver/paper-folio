import { describe, expect, it } from "vitest";
import { seccionActiva } from "./seccion-activa";

const secciones = [
  { id: "inicio", top: -900 },
  { id: "sobre-mi", top: -200 },
  { id: "proyectos", top: 300 },
  { id: "contacto", top: 1200 },
];

describe("seccionActiva", () => {
  it("elige la última sección cuyo borde superior ya pasó la línea de referencia", () => {
    expect(seccionActiva(secciones, 400)).toBe("proyectos");
    expect(seccionActiva(secciones, 100)).toBe("sobre-mi");
  });

  it("sin ninguna sección arriba de la línea no hay activa", () => {
    expect(seccionActiva([{ id: "inicio", top: 500 }], 100)).toBeNull();
    expect(seccionActiva([], 100)).toBeNull();
  });

  it("respeta el orden dado aunque haya una sección que no está en la página", () => {
    expect(seccionActiva([{ id: "a", top: 0 }, { id: "b", top: null }, { id: "c", top: 50 }], 100)).toBe("c");
  });
});
