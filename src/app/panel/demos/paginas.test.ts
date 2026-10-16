import { beforeEach, describe, expect, it, vi } from "vitest";

// Las páginas no pueden importar `@/auth` en Vitest: se mockean los permisos y el servicio.
const requerirRol = vi.fn();
const listarDemosAdmin = vi.fn();
const proyectosParaDemos = vi.fn();
const obtenerDemoAdmin = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
});
vi.mock("@/lib/permisos", () => ({ requerirRol: (...a: unknown[]) => requerirRol(...a) }));
vi.mock("@/lib/demos-admin", () => ({
  listarDemosAdmin: (...a: unknown[]) => listarDemosAdmin(...a),
  proyectosParaDemos: (...a: unknown[]) => proyectosParaDemos(...a),
  obtenerDemoAdmin: (...a: unknown[]) => obtenerDemoAdmin(...a),
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({ notFound: () => notFound(), redirect: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), refresh: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() }));

import DemosPage from "./page";
import NuevaDemoPage from "./nueva/page";
import EditarDemoPage from "./[id]/page";

const ID = "6528f0c2a1b2c3d4e5f60718";
const LEEN = [listarDemosAdmin, proyectosParaDemos, obtenerDemoAdmin];
const prohibido = () => requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
const conId = () => ({ params: Promise.resolve({ id: ID }) }) as PageProps<"/panel/demos/[id]">;

beforeEach(() => {
  for (const m of [requerirRol, notFound, ...LEEN]) m.mockClear();
  requerirRol.mockReset().mockResolvedValue({ id: "a1", rol: "admin" });
  listarDemosAdmin.mockReset().mockResolvedValue([]);
  proyectosParaDemos.mockReset().mockResolvedValue([]);
  obtenerDemoAdmin.mockReset().mockResolvedValue(null);
});

describe("/panel/demos", () => {
  it("exige admin antes de listar", async () => {
    await DemosPage();
    expect(requerirRol).toHaveBeenCalledWith("/panel/demos", "admin");
    expect(listarDemosAdmin).toHaveBeenCalledTimes(1);
  });

  it("a un operador le responde 403 sin leer nada", async () => {
    prohibido();
    await expect(DemosPage()).rejects.toThrow("403");
    for (const m of LEEN) expect(m).not.toHaveBeenCalled();
  });
});

describe("/panel/demos/nueva", () => {
  it("exige admin antes de leer los proyectos", async () => {
    await NuevaDemoPage();
    expect(requerirRol).toHaveBeenCalledWith("/panel/demos/nueva", "admin");
    expect(proyectosParaDemos).toHaveBeenCalledTimes(1);
    prohibido();
    proyectosParaDemos.mockClear();
    await expect(NuevaDemoPage()).rejects.toThrow("403");
    expect(proyectosParaDemos).not.toHaveBeenCalled();
  });
});

describe("/panel/demos/[id]", () => {
  it("exige admin antes de leer la demo", async () => {
    prohibido();
    await expect(EditarDemoPage(conId())).rejects.toThrow("403");
    for (const m of LEEN) expect(m).not.toHaveBeenCalled();
  });

  it("con admin lee la demo; si no existe, 404", async () => {
    await expect(EditarDemoPage(conId())).rejects.toThrow("404");
    expect(requerirRol).toHaveBeenCalledWith(`/panel/demos/${ID}`, "admin");
    expect(obtenerDemoAdmin).toHaveBeenCalledWith(ID);
  });
});
