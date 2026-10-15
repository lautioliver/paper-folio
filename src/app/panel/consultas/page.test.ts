import { beforeEach, describe, expect, it, vi } from "vitest";

// La página no puede importar `@/auth` en Vitest (next-auth no resuelve next/server): se mockea todo lo que la toca.
const requerirRol = vi.fn();
const listarConsultas = vi.fn();
vi.mock("@/lib/permisos", () => ({
  requerirRol: (...args: unknown[]) => requerirRol(...args),
}));
vi.mock("@/lib/bandeja", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bandeja")>()),
  listarConsultas: (...args: unknown[]) => listarConsultas(...args),
}));
vi.mock("next/server", () => ({ connection: async () => {} }));

import ConsultasPage from "./page";

const vacia = { items: [], total: 0, paginas: 0, pagina: 1 };
const props = { searchParams: Promise.resolve({}) } as unknown as Parameters<
  typeof ConsultasPage
>[0];

beforeEach(() => {
  requerirRol.mockReset();
  listarConsultas.mockReset();
  listarConsultas.mockResolvedValue(vacia);
});

describe("página /panel/consultas: permisos", () => {
  it("exige operador o admin, con la ruta a la que volver", async () => {
    requerirRol.mockResolvedValue({ id: "1", rol: "operador" });
    await ConsultasPage(props);
    expect(requerirRol).toHaveBeenCalledWith(
      "/panel/consultas",
      "operador",
      "admin",
    );
    expect(listarConsultas).toHaveBeenCalledTimes(1);
  });

  it("si requerirRol lanza (sin sesión o sin permiso), nunca lee las consultas", async () => {
    requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(ConsultasPage(props)).rejects.toThrow("403");
    expect(listarConsultas).not.toHaveBeenCalled();
  });
});
