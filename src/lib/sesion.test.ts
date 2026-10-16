import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvInvalidoError } from "./env";

// `@/auth` no resuelve en Vitest (next-auth importa next/server): se mockean la sesión, connection() y el rol de la base.
const auth = vi.fn();
const buscarRol = vi.fn();
vi.mock("@/auth", () => ({ auth: (...a: unknown[]) => auth(...a) }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("./usuarios", () => ({ buscarRol: (...a: unknown[]) => buscarRol(...a) }));

import { esAdminLaSesion } from "./sesion";

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

  it("si la base falla, tira: la ruta responde 204 sin contar", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    buscarRol.mockRejectedValue(Object.assign(new Error("x"), { name: "MongoServerSelectionError" }));
    await expect(esAdminLaSesion()).rejects.toThrow();
  });
});
