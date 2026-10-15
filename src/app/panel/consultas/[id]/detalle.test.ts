import { beforeEach, describe, expect, it, vi } from "vitest";

// El detalle no puede importar `@/auth` en Vitest: se mockean los permisos, el servicio y `notFound`.
const requerirRol = vi.fn();
const obtenerConsulta = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
});
vi.mock("@/lib/permisos", () => ({
  requerirRol: (...args: unknown[]) => requerirRol(...args),
}));
vi.mock("@/lib/seguimiento", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seguimiento")>()),
  obtenerConsulta: (...args: unknown[]) => obtenerConsulta(...args),
}));
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
// Las acciones importan `@/lib/permisos` (ya mockeado) y `next/cache`.
vi.mock("next/cache", () => ({ refresh: () => {} }));

import { DetalleConsulta } from "./detalle";

const ID = "6528f0c2a1b2c3d4e5f60718";
const consulta = {
  id: ID,
  nombre: "Ada Lovelace",
  email: "ada@example.com",
  tipo: "cotizacion",
  mensaje: "Quiero cotizar un sitio.",
  estado: "nueva",
  emailEnviado: true,
  creadaEn: new Date("2026-10-01T12:00:00Z"),
  seguimiento: [],
};

beforeEach(() => {
  requerirRol.mockReset();
  obtenerConsulta.mockReset();
  notFound.mockClear();
  requerirRol.mockResolvedValue({ id: "u1", rol: "operador" });
  obtenerConsulta.mockResolvedValue(consulta);
});

describe("detalle de una consulta: permisos", () => {
  it("exige operador o admin antes de leer la consulta", async () => {
    const orden: string[] = [];
    requerirRol.mockImplementation(async () => {
      orden.push("rol");
      return { id: "u1", rol: "operador" };
    });
    obtenerConsulta.mockImplementation(async () => {
      orden.push("leer");
      return consulta;
    });
    const r = await DetalleConsulta({ id: ID });
    expect(r).not.toBeNull();
    expect(requerirRol).toHaveBeenCalledWith(
      `/panel/consultas/${ID}`,
      "operador",
      "admin",
    );
    expect(orden).toEqual(["rol", "leer"]);
  });

  it("si requerirRol lanza (un usuario o sin sesión), nunca lee la consulta", async () => {
    requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(DetalleConsulta({ id: ID })).rejects.toThrow("403");
    expect(obtenerConsulta).not.toHaveBeenCalled();
  });
});

describe("detalle de una consulta: no encontrada", () => {
  it("un id inexistente o inválido responde 404", async () => {
    obtenerConsulta.mockResolvedValue(null);
    await expect(DetalleConsulta({ id: "no-es-un-id" })).rejects.toThrow(
      "404",
    );
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("la ruta para volver después de ingresar no lleva caracteres crudos del id", async () => {
    await DetalleConsulta({ id: "a b/../c" }).catch(() => {});
    expect(requerirRol.mock.calls[0]?.[0]).toBe(
      "/panel/consultas/a%20b%2F..%2Fc",
    );
  });
});
