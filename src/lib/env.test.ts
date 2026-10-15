import { describe, expect, it } from "vitest";
import { leerEmailConfig, leerEnv, leerIpHashSal, leerAuthConfig, leerAuthRoles } from "./env";
import { leerBlobConfig } from "./env";

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

  it("recorta los espacios de la clave", () => {
    expect(leerEmailConfig({ ...ok, RESEND_API_KEY: " re_clave_de_prueba\n" }).RESEND_API_KEY).toBe("re_clave_de_prueba");
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

describe("leerAuthConfig", () => {
  const completa = {
    AUTH_SECRET: "x".repeat(32),
    AUTH_GOOGLE_ID: "id-de-prueba.apps.googleusercontent.com",
    AUTH_GOOGLE_SECRET: "secreto-de-prueba",
  };

  it("devuelve las tres variables válidas", () => {
    expect(leerAuthConfig(completa)).toEqual(completa);
  });

  it("nombra la variable que falta o es corta, sin mostrar valores", () => {
    expect(() => leerAuthConfig({ ...completa, AUTH_SECRET: "corta" })).toThrow(/AUTH_SECRET: debe tener al menos 32/);
    expect(() => leerAuthConfig({ ...completa, AUTH_GOOGLE_ID: undefined })).toThrow(/AUTH_GOOGLE_ID: falta/);
    let error: unknown;
    try {
      leerAuthConfig({ ...completa, AUTH_SECRET: "valor-secreto" });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain("valor-secreto");
  });
});

describe("leerAuthRoles", () => {
  it("devuelve las listas tal cual y vacías si no están", () => {
    expect(leerAuthRoles({ ADMIN_EMAILS: "a@example.com", OPERADOR_EMAILS: "o@example.com" })).toEqual({
      admin: "a@example.com",
      operador: "o@example.com",
    });
    expect(leerAuthRoles({})).toEqual({ admin: "", operador: "" });
  });
});

describe("leerBlobConfig (Vercel Blob por OIDC, #47)", () => {
  it("devuelve BLOB_STORE_ID si empieza con store_, sin espacios del borde", () => {
    expect(leerBlobConfig({ BLOB_STORE_ID: "store_AbC123" })).toEqual({ BLOB_STORE_ID: "store_AbC123" });
    expect(leerBlobConfig({ BLOB_STORE_ID: " store_AbC123\n" }).BLOB_STORE_ID).toBe("store_AbC123");
  });

  it("falla nombrando BLOB_STORE_ID si falta o no empieza con store_, sin mostrar el valor", () => {
    expect(() => leerBlobConfig({})).toThrow(/BLOB_STORE_ID: falta/);
    // Vacía, como queda al copiar .env.example: también es "falta", no un valor mal escrito.
    expect(() => leerBlobConfig({ BLOB_STORE_ID: "" })).toThrow(/BLOB_STORE_ID: falta/);
    expect(() => leerBlobConfig({ BLOB_STORE_ID: "  " })).toThrow(/BLOB_STORE_ID: falta/);
    let mensaje = "";
    try {
      leerBlobConfig({ BLOB_STORE_ID: "vercel_blob_rw_secreto" });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toMatch(/BLOB_STORE_ID: debe empezar con store_/);
    expect(mensaje).not.toContain("vercel_blob_rw_secreto");
  });

  it("leerEnv no la exige (next build y /api/salud andan sin ella)", () => {
    expect(() => leerEnv(valida)).not.toThrow();
  });
});
