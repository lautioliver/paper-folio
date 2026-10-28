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

  it("ignora las secciones que no están en la página", () => {
    expect(seccionActiva([{ id: "a", top: 0 }, { id: "b", top: null }, { id: "c", top: 50 }], 100)).toBe("c");
  });

  it("elige por la posición en la página, no por el orden de la lista (el del menú)", () => {
    // Orden del menú; en la página Stack va arriba de Sobre mí y de Proyectos.
    const menu = [
      { id: "inicio", top: -2000 },
      { id: "sobre-mi", top: -300 },
      { id: "proyectos", top: 200 },
      { id: "stack", top: -1500 },
      { id: "contacto", top: 3000 },
    ];
    expect(seccionActiva(menu, 400)).toBe("proyectos");
    expect(seccionActiva(menu, 100)).toBe("sobre-mi");
  });
});
