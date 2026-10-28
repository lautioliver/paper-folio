import { describe, expect, it } from "vitest";
import { parseContactRequest, validateContactField } from "./contact";

const valid = {
  name: "Ana Pérez",
  email: "ana@example.com",
  type: "cotizacion",
  message: "Quiero cotizar una landing para mi emprendimiento.",
};

describe("parseContactRequest", () => {
  it("acepta una consulta completa y recorta espacios", () => {
    const result = parseContactRequest({ ...valid, name: "  Ana Pérez  " });
    expect(result).toEqual({ ok: true, data: valid });
  });

  it.each(["general", "cotizacion", "asesoria"])("acepta el tipo de consulta %s", (type) => {
    expect(parseContactRequest({ ...valid, type }).ok).toBe(true);
  });

  it("marca cada campo vacío con su error", () => {
    const result = parseContactRequest({ name: " ", email: "", type: "", message: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["email", "message", "name", "type"]);
  });

  it("rechaza un email inválido", () => {
    const result = parseContactRequest({ ...valid, email: "ana@" });
    expect(result).toEqual({ ok: false, errors: { email: expect.any(String) } });
  });

  it("rechaza un tipo de consulta fuera de los tres", () => {
    const result = parseContactRequest({ ...valid, type: "spam" });
    expect(result).toEqual({ ok: false, errors: { type: expect.any(String) } });
  });

  it.each([
    ["menos de 10 caracteres", "Hola"],
    ["más de 2000 caracteres", "a".repeat(2001)],
  ])("rechaza un mensaje de %s", (_caso, message) => {
    const result = parseContactRequest({ ...valid, message });
    expect(result).toEqual({ ok: false, errors: { message: expect.any(String) } });
  });

  it("rechaza lo que no es un objeto", () => {
    expect(parseContactRequest(null).ok).toBe(false);
  });
});

describe("regla del nombre", () => {
  it.each(["Ana", "Ana Pérez", "José Ñandú", "María-José", "O'Connor", "Zoë Müller", "Li"])("acepta %s", (name) => {
    expect(parseContactRequest({ ...valid, name }).ok).toBe(true);
  });

  it.each(["123", "!!!", "Ana 2", "Ana@", "A", "-", "- -", "a".repeat(101)])("rechaza %s", (name) => {
    expect(parseContactRequest({ ...valid, name })).toEqual({ ok: false, errors: { name: expect.any(String) } });
  });

  it("acepta 100 caracteres justos", () => {
    expect(parseContactRequest({ ...valid, name: "a".repeat(100) }).ok).toBe(true);
  });
});

describe("validateContactField", () => {
  it("devuelve undefined si el campo está bien", () => {
    expect(validateContactField("name", "Ana Pérez")).toBeUndefined();
    expect(validateContactField("email", "ana@example.com")).toBeUndefined();
    expect(validateContactField("type", "general")).toBeUndefined();
    expect(validateContactField("message", valid.message)).toBeUndefined();
  });

  it("devuelve el error de ese campo", () => {
    expect(validateContactField("name", "123")).toEqual(expect.any(String));
    expect(validateContactField("email", "ana@")).toEqual(expect.any(String));
    expect(validateContactField("type", "")).toEqual(expect.any(String));
    expect(validateContactField("message", "Hola")).toEqual(expect.any(String));
  });

  it("usa el mismo mensaje que el servidor", () => {
    const result = parseContactRequest({ ...valid, name: "123" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(validateContactField("name", "123")).toBe(result.errors.name);
  });
});
