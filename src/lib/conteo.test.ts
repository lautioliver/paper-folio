import { describe, expect, it } from "vitest";
import { valorEnProgreso } from "./conteo";

describe("valorEnProgreso", () => {
  it("empieza en 0 y termina en el objetivo", () => {
    expect(valorEnProgreso(12, 0)).toBe(0);
    expect(valorEnProgreso(12, 1)).toBe(12);
  });
  it("redondea a entero en el medio", () => {
    expect(valorEnProgreso(5, 0.5)).toBe(3);
    expect(valorEnProgreso(10, 0.25)).toBe(3);
  });
  it("un progreso fuera de rango no pasa de 0 ni del objetivo", () => {
    expect(valorEnProgreso(8, -1)).toBe(0);
    expect(valorEnProgreso(8, 2)).toBe(8);
  });
});
