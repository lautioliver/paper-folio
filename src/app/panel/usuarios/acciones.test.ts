import { beforeEach, describe, expect, it, vi } from "vitest";

// Las acciones no pueden importar `@/auth` en Vitest: se mockean los permisos, el servicio y next/navigation.
const requerirRol = vi.fn();
const cambiarRolUsuario = vi.fn();
const cambiarBloqueoUsuario = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT;${url}`);
});
vi.mock("@/lib/permisos", () => ({ requerirRol: (...a: unknown[]) => requerirRol(...a) }));
vi.mock("@/lib/usuarios-admin", () => ({
  cambiarRolUsuario: (...a: unknown[]) => cambiarRolUsuario(...a),
  cambiarBloqueoUsuario: (...a: unknown[]) => cambiarBloqueoUsuario(...a),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));

import { cambiarBloqueoAccion, cambiarRolAccion } from "./acciones";

const ID = "6528f0c2a1b2c3d4e5f60718";
const ADMIN = "6528f0c2a1b2c3d4e5f60001";
const SERVICIOS = [cambiarRolUsuario, cambiarBloqueoUsuario];

function form(campos: Record<string, string> = {}): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

beforeEach(() => {
  redirect.mockClear();
  requerirRol.mockReset().mockResolvedValue({ id: ADMIN, rol: "admin" });
  for (const m of SERVICIOS) m.mockReset().mockResolvedValue({ ok: true });
});

const ACCIONES = [
  { nombre: "cambiarRolAccion", correr: () => cambiarRolAccion(ID, "operador", form()), servicio: cambiarRolUsuario },
  { nombre: "cambiarBloqueoAccion", correr: () => cambiarBloqueoAccion(ID, true, form()), servicio: cambiarBloqueoUsuario },
];

describe.each(ACCIONES)("$nombre", ({ correr, servicio }) => {
  it("exige admin antes de tocar la base", async () => {
    await expect(correr()).rejects.toThrow("NEXT_REDIRECT");
    expect(requerirRol).toHaveBeenCalledWith("/panel/usuarios", "admin");
    expect(requerirRol.mock.invocationCallOrder[0]).toBeLessThan(servicio.mock.invocationCallOrder[0]);
  });

  it("un operador no puede llamarla: 403 sin tocar la base", async () => {
    requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(correr()).rejects.toThrow("403");
    for (const m of SERVICIOS) expect(m).not.toHaveBeenCalled();
  });

  it("el actor sale de la sesión, no del formulario", async () => {
    await expect(correr()).rejects.toThrow("NEXT_REDIRECT");
    expect(servicio.mock.calls[0][0]).toBe(ADMIN);
  });
});

describe("cambiarRolAccion", () => {
  it("delega el id y el rol, y vuelve a la misma búsqueda y página con el aviso", async () => {
    await expect(cambiarRolAccion(ID, "admin", form({ q: "ana", pagina: "2" }))).rejects.toThrow(
      "NEXT_REDIRECT;/panel/usuarios?q=ana&pagina=2&aviso=rol-cambiado",
    );
    expect(cambiarRolUsuario).toHaveBeenCalledWith(ADMIN, ID, "admin");
  });

  it("si el servicio lo rechaza, el aviso dice por qué", async () => {
    cambiarRolUsuario.mockResolvedValue({ ok: false, error: "propio" });
    await expect(cambiarRolAccion(ID, "usuario", form())).rejects.toThrow("NEXT_REDIRECT;/panel/usuarios?aviso=propio");
  });
});

describe("cambiarBloqueoAccion", () => {
  it("bloquear y desbloquear avisan cada uno lo suyo", async () => {
    await expect(cambiarBloqueoAccion(ID, true, form())).rejects.toThrow("aviso=bloqueado");
    expect(cambiarBloqueoUsuario).toHaveBeenLastCalledWith(ADMIN, ID, true);
    await expect(cambiarBloqueoAccion(ID, false, form())).rejects.toThrow("aviso=desbloqueado");
  });

  it("si el servicio lo rechaza, el aviso dice por qué", async () => {
    cambiarBloqueoUsuario.mockResolvedValue({ ok: false, error: "ultimo-admin" });
    await expect(cambiarBloqueoAccion(ID, true, form())).rejects.toThrow("aviso=ultimo-admin");
  });
});
