import { describe, expect, it } from "vitest";
import { mensajeDeValidez, type EstadoValidez } from "./validacion-campo";

const bien: EstadoValidez = { valueMissing: false, typeMismatch: false, patternMismatch: false, tooLong: false, tooShort: false };

describe("mensajeDeValidez", () => {
  it("no dice nada si el campo es válido", () => {
    expect(mensajeDeValidez(bien)).toBeUndefined();
  });

  it("pide completar un campo obligatorio vacío", () => {
    expect(mensajeDeValidez({ ...bien, valueMissing: true })).toMatch(/obligatorio|Completá/i);
  });

  it("explica una URL inválida y un email inválido", () => {
    expect(mensajeDeValidez({ ...bien, typeMismatch: true }, { tipo: "url" })).toMatch(/URL/);
    expect(mensajeDeValidez({ ...bien, typeMismatch: true }, { tipo: "email" })).toMatch(/email/);
  });

  it("dice el máximo y el mínimo de caracteres", () => {
    expect(mensajeDeValidez({ ...bien, tooLong: true }, { maxLength: 80 })).toMatch(/80/);
    expect(mensajeDeValidez({ ...bien, tooShort: true }, { minLength: 3 })).toMatch(/3/);
  });

  it("avisa de un formato que no cumple el patrón", () => {
    expect(mensajeDeValidez({ ...bien, patternMismatch: true })).toEqual(expect.any(String));
  });
});
