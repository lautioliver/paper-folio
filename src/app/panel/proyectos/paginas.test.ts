import { beforeEach, describe, expect, it, vi } from "vitest";

// Las páginas no pueden importar `@/auth` en Vitest: se mockean los permisos y el servicio.
const requerirRol = vi.fn();
const listarProyectosAdmin = vi.fn();
const obtenerProyectoAdmin = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
});
vi.mock("@/lib/permisos", () => ({ requerirRol: (...a: unknown[]) => requerirRol(...a) }));
vi.mock("@/lib/proyectos-admin", () => ({
  listarProyectosAdmin: (...a: unknown[]) => listarProyectosAdmin(...a),
  obtenerProyectoAdmin: (...a: unknown[]) => obtenerProyectoAdmin(...a),
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({ notFound: () => notFound(), redirect: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), refresh: vi.fn() }));

import ProyectosPanelPage from "./page";
import NuevoProyectoPage from "./nuevo/page";
import { EditarProyecto } from "./[id]/editar";

const ID = "6528f0c2a1b2c3d4e5f60718";
const prohibido = () => requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));

beforeEach(() => {
  for (const m of [requerirRol, listarProyectosAdmin, obtenerProyectoAdmin, notFound]) m.mockClear();
  requerirRol.mockReset().mockResolvedValue({ id: "a1", rol: "admin" });
  listarProyectosAdmin.mockReset().mockResolvedValue([]);
  obtenerProyectoAdmin.mockReset().mockResolvedValue(null);
});

describe("/panel/proyectos", () => {
  it("exige admin antes de listar", async () => {
    await ProyectosPanelPage();
    expect(requerirRol).toHaveBeenCalledWith("/panel/proyectos", "admin");
    expect(listarProyectosAdmin).toHaveBeenCalledTimes(1);
  });

  it("a un operador le responde 403 sin leer los proyectos", async () => {
    prohibido();
    await expect(ProyectosPanelPage()).rejects.toThrow("403");
    expect(listarProyectosAdmin).not.toHaveBeenCalled();
  });
});

describe("/panel/proyectos/nuevo", () => {
  it("exige admin", async () => {
    await NuevoProyectoPage();
    expect(requerirRol).toHaveBeenCalledWith("/panel/proyectos/nuevo", "admin");
    prohibido();
    await expect(NuevoProyectoPage()).rejects.toThrow("403");
  });
});

describe("/panel/proyectos/[id]", () => {
  it("exige admin antes de leer el proyecto", async () => {
    prohibido();
    await expect(EditarProyecto({ id: ID })).rejects.toThrow("403");
    expect(obtenerProyectoAdmin).not.toHaveBeenCalled();
  });

  it("con admin lee el proyecto; si no existe, 404", async () => {
    await expect(EditarProyecto({ id: ID })).rejects.toThrow("404");
    expect(requerirRol).toHaveBeenCalledWith(`/panel/proyectos/${ID}`, "admin");
    expect(obtenerProyectoAdmin).toHaveBeenCalledWith(ID);
  });
});
