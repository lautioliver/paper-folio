import { beforeEach, describe, expect, it, vi } from "vitest";

// La página no puede importar `@/auth` en Vitest: se mockean los permisos y el servicio.
const requerirRol = vi.fn();
const listarUsuarios = vi.fn();
vi.mock("@/lib/permisos", () => ({ requerirRol: (...a: unknown[]) => requerirRol(...a) }));
vi.mock("@/lib/usuarios-admin", () => ({
  POR_PAGINA: 20,
  listarUsuarios: (...a: unknown[]) => listarUsuarios(...a),
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./acciones", () => ({ cambiarRolAccion: vi.fn(), cambiarBloqueoAccion: vi.fn() }));

import UsuariosPage from "./page";

const props = (q: Record<string, string> = {}) =>
  ({ params: Promise.resolve({}), searchParams: Promise.resolve(q) }) as unknown as PageProps<"/panel/usuarios">;

beforeEach(() => {
  requerirRol.mockReset().mockResolvedValue({ id: "a1", rol: "admin" });
  listarUsuarios.mockReset().mockResolvedValue({ usuarios: [], total: 0, pagina: 1, paginas: 1 });
});

describe("/panel/usuarios", () => {
  it("exige admin antes de listar, con la búsqueda y la página de la URL", async () => {
    await UsuariosPage(props({ q: "ana", pagina: "2" }));
    expect(requerirRol).toHaveBeenCalledWith("/panel/usuarios", "admin");
    expect(listarUsuarios).toHaveBeenCalledWith({ q: "ana", pagina: 2 });
    expect(requerirRol.mock.invocationCallOrder[0]).toBeLessThan(listarUsuarios.mock.invocationCallOrder[0]);
  });

  it("a un operador le responde 403 sin leer los usuarios", async () => {
    requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(UsuariosPage(props())).rejects.toThrow("403");
    expect(listarUsuarios).not.toHaveBeenCalled();
  });
});
