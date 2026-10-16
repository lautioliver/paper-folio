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
vi.mock("@/lib/respuestas", () => ({ responderConsulta: vi.fn() }));

import { renderToStaticMarkup } from "react-dom/server";
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

async function html(extra: Record<string, unknown>): Promise<string> {
  obtenerConsulta.mockResolvedValue({ ...consulta, ...extra });
  return renderToStaticMarkup(await DetalleConsulta({ id: ID }));
}

const respuesta = (emailEnviado: boolean) => ({
  tipo: "respuesta",
  texto: "Hola Ada",
  autor: "u1",
  autorNombre: "Olga",
  fecha: new Date("2026-10-02T12:00:00Z"),
  emailEnviado,
});

describe("detalle de una consulta: respuestas por email (#40)", () => {
  it("muestra cuándo el email de una respuesta no se pudo enviar", async () => {
    const r = await html({ estado: "en_curso", seguimiento: [respuesta(false)] });
    expect(r).toContain("Hola Ada");
    expect(r).toContain("El email no se pudo enviar");
  });

  it("muestra las respuestas enviadas como enviadas", async () => {
    const r = await html({ estado: "respondida", seguimiento: [respuesta(true)] });
    expect(r).toContain("Enviada por email a ada@example.com");
    expect(r).not.toContain("El email no se pudo enviar");
  });

  it("en curso ofrece el formulario para responder, con el destino de la consulta y el límite de 5000", async () => {
    const r = await html({ estado: "en_curso" });
    expect(r).toContain("Responder por email");
    expect(r).toMatch(/<textarea[^>]*maxLength="5000"/i);
    expect(r).toMatch(/<textarea[^>]*minLength="1"|<textarea[^>]*required/i);
    // El destino no es un campo del formulario: sale de la consulta guardada.
    expect(r).not.toMatch(/<input[^>]*name="(email|to|destino)"/i);
  });

  it("fuera de en curso no ofrece el formulario y explica cómo responder", async () => {
    for (const estado of ["nueva", "respondida", "archivada"]) {
      const r = await html({ estado });
      expect(r).not.toMatch(/<textarea[^>]*name="respuesta"/i);
      expect(r).toContain("Para responder por email, pasá la consulta a En curso.");
    }
  });
});
