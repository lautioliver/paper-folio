import { beforeEach, describe, expect, it, vi } from "vitest";

// Las acciones no pueden importar `@/auth` en Vitest: se mockean los permisos, el servicio y `refresh`.
const requerirRol = vi.fn();
const cambiarEstado = vi.fn();
const agregarNota = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/permisos", () => ({
  requerirRol: (...args: unknown[]) => requerirRol(...args),
}));
vi.mock("@/lib/seguimiento", () => ({
  cambiarEstado: (...args: unknown[]) => cambiarEstado(...args),
  agregarNota: (...args: unknown[]) => agregarNota(...args),
}));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

import { agregarNotaAccion, cambiarEstadoAccion } from "./acciones";

const ID = "6528f0c2a1b2c3d4e5f60718";
const OPERADOR = "6528f0c2a1b2c3d4e5f60001";
const previo = { error: null };

function form(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

beforeEach(() => {
  for (const m of [requerirRol, cambiarEstado, agregarNota, refresh])
    m.mockReset();
  requerirRol.mockResolvedValue({ id: OPERADOR, rol: "operador" });
  cambiarEstado.mockResolvedValue({ ok: true });
  agregarNota.mockResolvedValue({ ok: true });
});

const ACCIONES = [
  {
    nombre: "cambiarEstadoAccion",
    correr: () =>
      cambiarEstadoAccion(ID, previo, form({ estado: "en_curso" })),
    servicio: cambiarEstado,
  },
  {
    nombre: "agregarNotaAccion",
    correr: () => agregarNotaAccion(ID, previo, form({ texto: "Una nota" })),
    servicio: agregarNota,
  },
];

describe.each(ACCIONES)("$nombre: permisos", ({ correr, servicio }) => {
  it("exige operador o admin, con la ruta del detalle para volver", async () => {
    await correr();
    expect(requerirRol).toHaveBeenCalledWith(
      `/panel/consultas/${ID}`,
      "operador",
      "admin",
    );
  });

  it("si requerirRol lanza (un usuario, o sin sesión), no escribe nada aunque la llamen directo", async () => {
    requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(correr()).rejects.toThrow("403");
    expect(servicio).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("con admin también pasa", async () => {
    requerirRol.mockResolvedValue({ id: OPERADOR, rol: "admin" });
    await expect(correr()).resolves.toMatchObject({ error: null });
    expect(servicio).toHaveBeenCalledTimes(1);
  });
});

describe("cambiarEstadoAccion", () => {
  it("pasa el estado del formulario y el autor de la sesión, nunca uno del formulario", async () => {
    const r = await cambiarEstadoAccion(
      ID,
      previo,
      form({ estado: "en_curso", autor: "otro" }),
    );
    expect(cambiarEstado).toHaveBeenCalledWith(ID, "en_curso", OPERADOR);
    expect(r).toEqual({ error: null });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("con una transición inválida devuelve el mensaje y refresca, para que se vea el estado real", async () => {
    // Otro operador pudo haberla cambiado en el medio: la pantalla de este quedó vieja.
    cambiarEstado.mockResolvedValue({
      ok: false,
      error: "transicion-invalida",
      mensaje: "No se puede pasar de Respondida a Nueva.",
    });
    const r = await cambiarEstadoAccion(ID, previo, form({ estado: "nueva" }));
    expect(r).toEqual({ error: "No se puede pasar de Respondida a Nueva." });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("con un estado inválido o una consulta inexistente, devuelve el mensaje y no refresca", async () => {
    for (const error of ["invalida", "no-encontrada"]) {
      cambiarEstado.mockResolvedValue({ ok: false, error, mensaje: "x" });
      expect(await cambiarEstadoAccion(ID, previo, form({ estado: "y" }))).toEqual({ error: "x" });
    }
    expect(refresh).not.toHaveBeenCalled();
  });

  it("sin el campo estado, se lo pasa al servicio como null (que lo rechaza)", async () => {
    await cambiarEstadoAccion(ID, previo, form({}));
    expect(cambiarEstado).toHaveBeenCalledWith(ID, null, OPERADOR);
  });
});

describe("agregarNotaAccion", () => {
  it("pasa el texto del formulario y el autor de la sesión", async () => {
    const r = await agregarNotaAccion(ID, previo, form({ texto: "Hola" }));
    expect(agregarNota).toHaveBeenCalledWith(ID, "Hola", OPERADOR);
    expect(r).toEqual({ error: null, texto: "" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("si el servicio rechaza la nota, devuelve el mensaje y no refresca", async () => {
    agregarNota.mockResolvedValue({
      ok: false,
      error: "invalida",
      mensaje: "La nota tiene que tener entre 1 y 2000 caracteres.",
    });
    const r = await agregarNotaAccion(ID, previo, form({ texto: "x".repeat(2500) }));
    expect(r.error).toMatch(/2000/);
    // React resetea el formulario después de la acción: el texto vuelve para no perder la nota.
    expect(r.texto).toBe("x".repeat(2500));
    expect(refresh).not.toHaveBeenCalled();
  });
});
