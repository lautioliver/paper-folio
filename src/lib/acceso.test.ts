import { describe, expect, it } from "vitest";
import type { Rol } from "@/models/Usuario";
import {
  emailsDeLista,
  evaluarAcceso,
  permiteIngreso,
  respuestaSinAcceso,
  revisarCambio,
  rutaInterna,
  urlDeIngreso,
} from "./acceso";

const base: Record<string, Rol> = { u1: "usuario", o1: "operador", a1: "admin" };
const buscarRol = async (id: string) => base[id] ?? null;
const sesion = (id: string, rol: Rol) => ({ user: { id, rol } });
const PANEL = ["operador", "admin"] as const;

describe("evaluarAcceso", () => {
  it("sin sesión → sin-sesion", async () => {
    expect(await evaluarAcceso(null, PANEL, buscarRol)).toEqual({ ok: false, motivo: "sin-sesion" });
    expect(await evaluarAcceso({ user: null }, PANEL, buscarRol)).toEqual({ ok: false, motivo: "sin-sesion" });
  });

  it("operador y admin pasan al panel", async () => {
    expect(await evaluarAcceso(sesion("o1", "operador"), PANEL, buscarRol)).toEqual({ ok: true, id: "o1", rol: "operador" });
    expect(await evaluarAcceso(sesion("a1", "admin"), PANEL, buscarRol)).toEqual({ ok: true, id: "a1", rol: "admin" });
  });

  it("un usuario no pasa al panel", async () => {
    expect(await evaluarAcceso(sesion("u1", "usuario"), PANEL, buscarRol)).toEqual({ ok: false, motivo: "sin-permiso" });
  });

  it("manda el rol de la base, no el del token", async () => {
    // El token dice admin, pero en la base es usuario (le sacaron el rol): no pasa.
    expect(await evaluarAcceso(sesion("u1", "admin"), PANEL, buscarRol)).toEqual({ ok: false, motivo: "sin-permiso" });
  });

  it("si el usuario ya no existe en la base → sesion-huerfana", async () => {
    expect(await evaluarAcceso(sesion("borrado", "admin"), PANEL, buscarRol)).toEqual({ ok: false, motivo: "sesion-huerfana" });
  });

  it("sin roles pedidos alcanza con tener sesión de un usuario existente", async () => {
    expect(await evaluarAcceso(sesion("u1", "usuario"), [], buscarRol)).toEqual({ ok: true, id: "u1", rol: "usuario" });
  });
});

describe("evaluarAcceso con usuario borrado", () => {
  it("sesión válida pero el usuario ya no existe → sesion-huerfana (no sin-sesion, para no rebotar con /ingresar)", async () => {
    expect(await evaluarAcceso({ user: { id: "borrado", rol: "admin" } }, ["admin"], async () => null)).toEqual({
      ok: false,
      motivo: "sesion-huerfana",
    });
  });
});

describe("rutaInterna", () => {
  it.each([
    ["/proyectos/ucanode", "/proyectos/ucanode"],
    ["/panel?x=1", "/panel?x=1"],
    ["//evil.com", "/"],
    ["/\\evil.com", "/"],
    ["https://evil.com", "/"],
    ["javascript:alert(1)", "/"],
    ["", "/"],
    ["/\t/evil.com", "/"],
    ["/\n/evil.com", "/"],
    ["/ok con espacio", "/"],
  ])("%j → %s", (entrada, salida) => {
    expect(rutaInterna(entrada)).toBe(salida);
  });
});

describe("urlDeIngreso", () => {
  it("arma /ingresar con callbackUrl codificado", () => {
    expect(urlDeIngreso("/proyectos/ucanode", "sin-sesion")).toBe("/ingresar?callbackUrl=%2Fproyectos%2Fucanode");
  });

  it("una ruta externa vuelve al inicio", () => {
    expect(urlDeIngreso("//evil.com", "sin-sesion")).toBe("/ingresar?callbackUrl=%2F");
    expect(urlDeIngreso("/cuenta?a=1", "sin-sesion")).toBe("/ingresar?callbackUrl=%2Fcuenta%3Fa%3D1");
  });

  it("con sesión huérfana suma error=sesion", () => {
    expect(urlDeIngreso("/panel", "sesion-huerfana")).toBe("/ingresar?callbackUrl=%2Fpanel&error=sesion");
    expect(urlDeIngreso("/panel", "sin-sesion")).toBe("/ingresar?callbackUrl=%2Fpanel");
  });
});

describe("respuestaSinAcceso (APIs, #47)", () => {
  it("sin sesión o con sesión huérfana: 401 JSON SIN_SESION, sin redirect", async () => {
    for (const motivo of ["sin-sesion", "sesion-huerfana"] as const) {
      const res = respuestaSinAcceso(motivo);
      expect(res.status).toBe(401);
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      expect(await res.json()).toEqual({ error: { codigo: "SIN_SESION", mensaje: expect.any(String) } });
    }
  });

  it("sin el rol: 403 JSON SIN_PERMISO", async () => {
    const res = respuestaSinAcceso("sin-permiso");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { codigo: "SIN_PERMISO", mensaje: expect.any(String) } });
  });
});

describe("usuario bloqueado (#49)", () => {
  it("evaluarAcceso lo trata como sin permiso, aunque el token diga admin y no se pidan roles", async () => {
    const bloqueado = async () => "bloqueado" as const;
    expect(await evaluarAcceso(sesion("b1", "admin"), ["admin"], bloqueado)).toEqual({ ok: false, motivo: "bloqueado" });
    expect(await evaluarAcceso(sesion("b1", "usuario"), [], bloqueado)).toEqual({ ok: false, motivo: "bloqueado" });
  });

  it("urlDeIngreso suma error=bloqueado (así /ingresar no lo devuelve a la página)", () => {
    expect(urlDeIngreso("/panel", "bloqueado")).toBe("/ingresar?callbackUrl=%2Fpanel&error=bloqueado");
  });

  it("respuestaSinAcceso: 403 JSON CUENTA_BLOQUEADA", async () => {
    const res = respuestaSinAcceso("bloqueado");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { codigo: "CUENTA_BLOQUEADA", mensaje: expect.any(String) } });
  });
});

describe("permiteIngreso (callback signIn, #49)", () => {
  const google = { proveedor: "google", emailVerificado: true, email: "v@example.com" };
  const libre = async () => false;

  it("una cuenta de Google verificada y no bloqueada ingresa", async () => {
    expect(await permiteIngreso(google, libre)).toBe(true);
  });

  it("una cuenta bloqueada no ingresa (signIn devuelve false)", async () => {
    const consultados: string[] = [];
    const bloqueada = async (email: string) => {
      consultados.push(email);
      return true;
    };
    expect(await permiteIngreso(google, bloqueada)).toBe(false);
    expect(consultados).toEqual(["v@example.com"]);
  });

  it("sin email verificado, de otro proveedor o sin email no ingresa (y no consulta la base)", async () => {
    let consultas = 0;
    const contar = async () => {
      consultas++;
      return false;
    };
    expect(await permiteIngreso({ ...google, emailVerificado: false }, contar)).toBe(false);
    expect(await permiteIngreso({ ...google, proveedor: "github" }, contar)).toBe(false);
    expect(await permiteIngreso({ ...google, email: null }, contar)).toBe(false);
    expect(consultas).toBe(0);
  });

  it("si la base falla, lanza (falla cerrado)", async () => {
    const caida = async (): Promise<boolean> => {
      throw new Error("MongoServerSelectionError");
    };
    await expect(permiteIngreso(google, caida)).rejects.toThrow();
  });
});

describe("emailsDeLista", () => {
  it("normaliza espacios y mayúsculas y descarta vacíos", () => {
    expect([...emailsDeLista(" A@x.com ,, b@x.com ")]).toEqual(["a@x.com", "b@x.com"]);
    expect(emailsDeLista("").size).toBe(0);
  });
});

describe("revisarCambio (reglas del panel de usuarios, #49)", () => {
  const usuario = { id: "u1", rol: "usuario" as Rol, bloqueado: false, porEntorno: false };
  const admin = { id: "a2", rol: "admin" as Rol, bloqueado: false, porEntorno: false };
  const deEntorno = { id: "e1", rol: "admin" as Rol, bloqueado: false, porEntorno: true };
  const revisar = (objetivo: typeof usuario, cambio: Parameters<typeof revisarCambio>[0]["cambio"], otrosAdmins = 1) =>
    revisarCambio({ actorId: "a1", objetivo, cambio, otrosAdmins });

  it("un admin no se degrada ni se bloquea a sí mismo", () => {
    const yo = { ...admin, id: "a1" };
    expect(revisar(yo, { tipo: "rol", rol: "usuario" })).toBe("propio");
    expect(revisar(yo, { tipo: "rol", rol: "operador" })).toBe("propio");
    expect(revisar(yo, { tipo: "bloqueo", bloqueado: true })).toBe("propio");
  });

  it("un email de ADMIN_EMAILS no se degrada ni se bloquea", () => {
    expect(revisar(deEntorno, { tipo: "rol", rol: "usuario" })).toBe("entorno");
    expect(revisar(deEntorno, { tipo: "rol", rol: "operador" })).toBe("entorno");
    expect(revisar(deEntorno, { tipo: "bloqueo", bloqueado: true })).toBe("entorno");
  });

  it("no se le quita el admin al único que queda", () => {
    expect(revisar(admin, { tipo: "rol", rol: "operador" }, 0)).toBe("ultimo-admin");
    expect(revisar(admin, { tipo: "bloqueo", bloqueado: true }, 0)).toBe("ultimo-admin");
    expect(revisar(admin, { tipo: "rol", rol: "operador" }, 1)).toBeNull();
  });

  it("los cambios comunes pasan", () => {
    expect(revisar(usuario, { tipo: "rol", rol: "operador" }, 0)).toBeNull();
    expect(revisar(usuario, { tipo: "rol", rol: "admin" }, 0)).toBeNull();
    expect(revisar(usuario, { tipo: "bloqueo", bloqueado: true }, 0)).toBeNull();
    expect(revisar({ ...usuario, bloqueado: true }, { tipo: "bloqueo", bloqueado: false }, 0)).toBeNull();
    // Desbloquear a uno de ADMIN_EMAILS (bloqueado a mano en la base) devuelve acceso: se permite.
    expect(revisar({ ...deEntorno, bloqueado: true }, { tipo: "bloqueo", bloqueado: false })).toBeNull();
  });
});
