import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/auth` no carga en Vitest (next-auth no resuelve next/server): se mockean la sesión y la base.
const auth = vi.fn();
const buscarRol = vi.fn();
const redirect = vi.fn();
const forbidden = vi.fn();
vi.mock("@/auth", () => ({ auth: () => auth() }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (...a: unknown[]) => redirect(...a),
  forbidden: () => forbidden(),
}));
vi.mock("./usuarios", () => ({ buscarRol: (id: string) => buscarRol(id) }));

import { requerirRol, requerirRolApi, requerirSesion } from "./permisos";

beforeEach(() => {
  auth.mockReset();
  buscarRol.mockReset();
  redirect.mockReset();
  forbidden.mockReset();
});

describe("requerirRolApi (#47)", () => {
  it("sin sesión: 401 JSON SIN_SESION, sin redirect", async () => {
    auth.mockResolvedValue(null);
    const r = await requerirRolApi("admin");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.respuesta.status).toBe(401);
    expect(await r.respuesta.json()).toMatchObject({ error: { codigo: "SIN_SESION" } });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("con sesión pero sin el rol (releído de la base): 403 JSON SIN_PERMISO, sin forbidden()", async () => {
    // El token dice admin, pero en la base ya es usuario: vale la base.
    auth.mockResolvedValue({ user: { id: "u1", rol: "admin" } });
    buscarRol.mockResolvedValue("usuario");
    const r = await requerirRolApi("admin");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.respuesta.status).toBe(403);
    expect(await r.respuesta.json()).toMatchObject({ error: { codigo: "SIN_PERMISO" } });
    expect(buscarRol).toHaveBeenCalledWith("u1");
    expect(forbidden).not.toHaveBeenCalled();
  });

  it("con sesión huérfana (usuario que ya no está en la base): 401", async () => {
    auth.mockResolvedValue({ user: { id: "u9", rol: "admin" } });
    buscarRol.mockResolvedValue(null);
    const r = await requerirRolApi("admin");
    expect(r.ok ? 200 : r.respuesta.status).toBe(401);
  });

  it("con admin pasa y devuelve el id y el rol", async () => {
    auth.mockResolvedValue({ user: { id: "a1", rol: "admin" } });
    buscarRol.mockResolvedValue("admin");
    expect(await requerirRolApi("admin")).toEqual({ ok: true, id: "a1", rol: "admin" });
  });

  it("acepta varios roles", async () => {
    auth.mockResolvedValue({ user: { id: "o1", rol: "operador" } });
    buscarRol.mockResolvedValue("operador");
    expect(await requerirRolApi("operador", "admin")).toMatchObject({ ok: true, rol: "operador" });
  });
});

describe("cuenta bloqueada (#49)", () => {
  it("requerirRol redirige a /ingresar con error=bloqueado, aunque el token diga admin", async () => {
    auth.mockResolvedValue({ user: { id: "b1", rol: "admin" } });
    buscarRol.mockResolvedValue("bloqueado");
    redirect.mockImplementation((u: string) => {
      throw new Error(`NEXT_REDIRECT;${u}`);
    });
    await expect(requerirRol("/panel/usuarios", "admin")).rejects.toThrow(
      "NEXT_REDIRECT;/ingresar?callbackUrl=%2Fpanel%2Fusuarios&error=bloqueado",
    );
    await expect(requerirSesion("/cuenta")).rejects.toThrow("error=bloqueado");
    expect(forbidden).not.toHaveBeenCalled();
  });

  it("requerirRolApi: 403 CUENTA_BLOQUEADA", async () => {
    auth.mockResolvedValue({ user: { id: "b1", rol: "admin" } });
    buscarRol.mockResolvedValue("bloqueado");
    const r = await requerirRolApi("admin");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.respuesta.status).toBe(403);
    expect(await r.respuesta.json()).toMatchObject({ error: { codigo: "CUENTA_BLOQUEADA" } });
  });
});
