import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvInvalidoError } from "./env";

// `@/auth` no resuelve en Vitest (next-auth importa next/server): se mockean la sesión, connection() y el rol de la base.
const auth = vi.fn();
const buscarRol = vi.fn();
vi.mock("@/auth", () => ({ auth: (...a: unknown[]) => auth(...a) }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("./usuarios", () => ({ buscarRol: (...a: unknown[]) => buscarRol(...a) }));

import { esAdminLaSesion, sesionParaLaBarra } from "./sesion";

beforeEach(() => {
  auth.mockReset();
  buscarRol.mockReset();
});

describe("esAdminLaSesion (para no contar las visitas de los admin)", () => {
  it("true solo si el rol releído de la base es admin", async () => {
    auth.mockResolvedValue({ user: { id: "u1", rol: "usuario" } });
    buscarRol.mockResolvedValue("admin");
    expect(await esAdminLaSesion()).toBe(true);
    expect(buscarRol).toHaveBeenCalledWith("u1");
  });

  it("false para operador, usuario, una cuenta bloqueada o un usuario borrado, aunque el token diga admin", async () => {
    auth.mockResolvedValue({ user: { id: "u1", rol: "admin" } });
    for (const estado of ["operador", "usuario", "bloqueado", null]) {
      buscarRol.mockResolvedValue(estado);
      expect(await esAdminLaSesion(), String(estado)).toBe(false);
    }
  });

  it("false sin sesión (sin leer la base) o si Auth.js no está configurado", async () => {
    auth.mockResolvedValue(null);
    expect(await esAdminLaSesion()).toBe(false);
    auth.mockRejectedValue(new EnvInvalidoError("x"));
    expect(await esAdminLaSesion()).toBe(false);
    expect(buscarRol).not.toHaveBeenCalled();
  });

  it("false si ADMIN_EMAILS es inválida al releer el rol (configuración, no un fallo de la base)", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    buscarRol.mockRejectedValue(new EnvInvalidoError("Variables de entorno inválidas: ADMIN_EMAILS"));
    await expect(esAdminLaSesion()).resolves.toBe(false);
  });

  it("false si auth() falla por otra cosa (una cookie corrupta), y loguea solo el nombre del error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockRejectedValue(Object.assign(new Error("token secreto-123"), { name: "JWTSessionError" }));
    expect(await esAdminLaSesion()).toBe(false);
    const logueado = JSON.stringify(log.mock.calls);
    expect(logueado).toContain("JWTSessionError");
    expect(logueado).not.toContain("secreto-123");
    log.mockRestore();
  });

  it("si la base falla, tira: la ruta responde 204 sin contar", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    buscarRol.mockRejectedValue(Object.assign(new Error("x"), { name: "MongoServerSelectionError" }));
    await expect(esAdminLaSesion()).rejects.toThrow();
  });
});

describe("sesionParaLaBarra (el menú de la cuenta, #109)", () => {
  it("usa el rol vigente de la base, no el del token: un cambio de rol se ve sin volver a ingresar", async () => {
    for (const rol of ["operador", "admin"]) {
      auth.mockResolvedValue({ user: { id: "u1", name: "Ana", rol: "usuario" } });
      buscarRol.mockResolvedValue(rol);
      const sesion = await sesionParaLaBarra();
      expect(sesion?.user?.rol, rol).toBe(rol);
      expect(sesion?.user?.name).toBe("Ana");
    }
    expect(buscarRol).toHaveBeenCalledWith("u1");
  });

  it("sin rol (no muestra Panel) si en la base ya no es admin, está bloqueada o se borró, aunque el token diga admin", async () => {
    for (const estado of ["usuario", "bloqueado", null]) {
      auth.mockResolvedValue({ user: { id: "u1", rol: "admin" } });
      buscarRol.mockResolvedValue(estado);
      const sesion = await sesionParaLaBarra();
      expect(sesion?.user?.id, String(estado)).toBe("u1");
      expect(sesion?.user?.rol === "admin" || sesion?.user?.rol === "operador", String(estado)).toBe(false);
    }
  });

  it("si la base o ADMIN_EMAILS fallan, la barra sigue con la cuenta y sin Panel (no rompe la landing)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const error of [new EnvInvalidoError("ADMIN_EMAILS"), Object.assign(new Error("x"), { name: "MongoServerSelectionError" })]) {
      auth.mockResolvedValue({ user: { id: "u1", rol: "admin" } });
      buscarRol.mockRejectedValue(error);
      const sesion = await sesionParaLaBarra();
      expect(sesion?.user?.id, error.name).toBe("u1");
      expect(sesion?.user?.rol, error.name).toBeUndefined();
    }
    log.mockRestore();
  });

  it("sin sesión no lee la base", async () => {
    auth.mockResolvedValue(null);
    expect(await sesionParaLaBarra()).toBeNull();
    expect(buscarRol).not.toHaveBeenCalled();
  });
});

describe("la cookie de Auth.js ya no se lee (decisión de @lautioliver en el PR #73)", () => {
  it("sesion no expone vueltaDeAuthJs", async () => {
    expect(Object.keys(await import("./sesion"))).not.toContain("vueltaDeAuthJs");
  });
});
