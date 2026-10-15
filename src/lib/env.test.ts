import { describe, expect, it } from "vitest";
import { leerEnv, leerIpHashSal } from "./env";

const valida = {
  MONGODB_URI: "mongodb://localhost:27017",
  MONGODB_DB: "paperfolio-dev",
};

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

describe("IP_HASH_SAL", () => {
  const sal = "una-sal-de-16-chars";

  it("leerIpHashSal devuelve la sal si tiene 16 caracteres o más", () => {
    expect(leerIpHashSal({ IP_HASH_SAL: sal })).toBe(sal);
    expect(leerIpHashSal({ IP_HASH_SAL: "x".repeat(16) })).toBe("x".repeat(16));
  });

  it("falla nombrando IP_HASH_SAL si falta o es corta, sin mostrar el valor", () => {
    expect(() => leerIpHashSal({})).toThrow(/IP_HASH_SAL/);
    let mensaje = "";
    try {
      leerIpHashSal({ IP_HASH_SAL: "corta-secreta" });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toMatch(/IP_HASH_SAL/);
    expect(mensaje).not.toContain("corta-secreta");
  });

  it("leerEnv no la exige: /api/salud y la base siguen andando sin ella", () => {
    expect(() => leerEnv(valida)).not.toThrow();
    expect(leerEnv({ ...valida, IP_HASH_SAL: sal })).not.toHaveProperty("IP_HASH_SAL");
  });
});
