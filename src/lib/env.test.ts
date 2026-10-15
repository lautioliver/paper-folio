import { describe, expect, it } from "vitest";
import { leerEmailConfig, leerEnv, leerIpHashSal } from "./env";

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

describe("RESEND_API_KEY y CONTACTO_EMAIL_DESTINO", () => {
  const ok = { RESEND_API_KEY: "re_clave_de_prueba", CONTACTO_EMAIL_DESTINO: "destino@example.com" };

  it("leerEmailConfig devuelve ambas si son válidas", () => {
    expect(leerEmailConfig(ok)).toEqual(ok);
  });

  it("falla nombrando la variable si falta, la clave no empieza con re_ o el destino no es un email", () => {
    expect(() => leerEmailConfig({ CONTACTO_EMAIL_DESTINO: ok.CONTACTO_EMAIL_DESTINO })).toThrow(/RESEND_API_KEY/);
    expect(() => leerEmailConfig({ ...ok, RESEND_API_KEY: "sk_otra" })).toThrow(/RESEND_API_KEY/);
    expect(() => leerEmailConfig({ RESEND_API_KEY: ok.RESEND_API_KEY })).toThrow(/CONTACTO_EMAIL_DESTINO/);
    expect(() => leerEmailConfig({ ...ok, CONTACTO_EMAIL_DESTINO: "no-es-email" })).toThrow(/CONTACTO_EMAIL_DESTINO/);
  });

  it("dice falta si no está y recorta los espacios del borde", () => {
    expect(() => leerEmailConfig({ RESEND_API_KEY: ok.RESEND_API_KEY })).toThrow(/CONTACTO_EMAIL_DESTINO: falta/);
    expect(leerEmailConfig({ ...ok, CONTACTO_EMAIL_DESTINO: " destino@example.com\n" }).CONTACTO_EMAIL_DESTINO).toBe(
      "destino@example.com",
    );
  });

  it("no muestra el valor en el error", () => {
    let mensaje = "";
    try {
      leerEmailConfig({ ...ok, RESEND_API_KEY: "clave-secreta" });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).not.toContain("clave-secreta");
  });

  it("leerEnv no las exige", () => {
    expect(() => leerEnv(valida)).not.toThrow();
  });
});
