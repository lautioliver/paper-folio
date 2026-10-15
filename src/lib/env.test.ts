import { describe, expect, it } from "vitest";
import { leerEnv } from "./env";

const valida = { MONGODB_URI: "mongodb://localhost:27017", MONGODB_DB: "paperfolio-dev" };

describe("leerEnv", () => {
  it("devuelve las variables tipadas cuando son válidas", () => {
    expect(leerEnv(valida)).toEqual(valida);
  });

  it("acepta mongodb+srv://", () => {
    const uri = "mongodb+srv://usuario:clave@cluster0.abc.mongodb.net";
    expect(leerEnv({ ...valida, MONGODB_URI: uri }).MONGODB_URI).toBe(uri);
  });

  it("falla nombrando MONGODB_URI si falta", () => {
    expect(() => leerEnv({ MONGODB_DB: "x" })).toThrow(/MONGODB_URI/);
  });

  it("falla nombrando MONGODB_DB si falta o está vacía", () => {
    expect(() => leerEnv({ MONGODB_URI: valida.MONGODB_URI })).toThrow(/MONGODB_DB/);
    expect(() => leerEnv({ ...valida, MONGODB_DB: "" })).toThrow(/MONGODB_DB/);
  });

  it("falla con un formato inválido sin mostrar el valor", () => {
    const secreto = "postgres://usuario:clave-secreta@host/db";
    let mensaje = "";
    try {
      leerEnv({ ...valida, MONGODB_URI: secreto });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toMatch(/MONGODB_URI/);
    expect(mensaje).not.toContain("clave-secreta");
    expect(mensaje).not.toContain(secreto);
  });
});
