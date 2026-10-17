import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/lib/permisos` importa `@/auth`, que no carga en Vitest: se mockean la sesión, el contenido y el contador.
const requerirSesion = vi.fn();
const detalleProyecto = vi.fn();
const registrarAcceso = vi.fn();
const despues: Array<() => unknown> = [];
vi.mock("./permisos", () => ({ requerirSesion: (...a: unknown[]) => requerirSesion(...a) }));
vi.mock("./contenido", () => ({ detalleProyecto: (...a: unknown[]) => detalleProyecto(...a) }));
vi.mock("./accesos", () => ({ registrarAcceso: (...a: unknown[]) => registrarAcceso(...a) }));
vi.mock("next/server", () => ({ after: (tarea: () => unknown) => despues.push(tarea) }));

import { verCasoDeEstudio } from "./caso-de-estudio";

const DETALLE = { proyecto: { slug: "paperfolio" }, demos: [] };

async function correrDespues() {
  for (const tarea of despues.splice(0)) await tarea();
}

beforeEach(() => {
  despues.length = 0;
  requerirSesion.mockReset().mockResolvedValue({ id: "u1", rol: "usuario" });
  detalleProyecto.mockReset().mockResolvedValue(DETALLE);
  registrarAcceso.mockReset().mockResolvedValue(true);
});

describe("verCasoDeEstudio", () => {
  it("con sesión y un proyecto publicado devuelve el detalle y cuenta un acceso de tipo detalle", async () => {
    expect(await verCasoDeEstudio("paperfolio")).toBe(DETALLE);
    expect(requerirSesion).toHaveBeenCalledWith("/proyectos/paperfolio");
    await correrDespues();
    expect(registrarAcceso).toHaveBeenCalledExactlyOnceWith("u1", "detalle");
  });

  it("la sesión se exige antes de leer el proyecto", async () => {
    await verCasoDeEstudio("paperfolio");
    expect(requerirSesion.mock.invocationCallOrder[0]).toBeLessThan(detalleProyecto.mock.invocationCallOrder[0]);
  });

  it("sin sesión (requerirSesion redirige) no lee el proyecto ni cuenta nada", async () => {
    requerirSesion.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(verCasoDeEstudio("paperfolio")).rejects.toThrow("NEXT_REDIRECT");
    await correrDespues();
    expect(detalleProyecto).not.toHaveBeenCalled();
    expect(registrarAcceso).not.toHaveBeenCalled();
  });

  it("un proyecto despublicado o inexistente no cuenta un acceso", async () => {
    detalleProyecto.mockResolvedValue(null);
    expect(await verCasoDeEstudio("no-existe")).toBeNull();
    await correrDespues();
    expect(registrarAcceso).not.toHaveBeenCalled();
  });
});
