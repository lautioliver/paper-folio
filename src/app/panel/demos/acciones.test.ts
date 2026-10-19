import { beforeEach, describe, expect, it, vi } from "vitest";

// Las acciones no pueden importar `@/auth` en Vitest: se mockean los permisos, el servicio y next/cache.
const requerirRol = vi.fn();
const crearDemo = vi.fn();
const editarDemo = vi.fn();
const activarDemo = vi.fn();
const moverDemo = vi.fn();
const borrarDemo = vi.fn();
const updateTag = vi.fn();
const refresh = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT;${url}`);
});
vi.mock("@/lib/permisos", () => ({ requerirRol: (...a: unknown[]) => requerirRol(...a) }));
vi.mock("@/lib/demos-admin", () => ({
  crearDemo: (...a: unknown[]) => crearDemo(...a),
  editarDemo: (...a: unknown[]) => editarDemo(...a),
  activarDemo: (...a: unknown[]) => activarDemo(...a),
  moverDemo: (...a: unknown[]) => moverDemo(...a),
  borrarDemo: (...a: unknown[]) => borrarDemo(...a),
}));
vi.mock("next/cache", () => ({
  updateTag: (t: string) => updateTag(t),
  refresh: () => refresh(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));

import { TAG_CONTENIDO } from "@/lib/contenido";
import { activarDemoAccion, borrarDemoAccion, guardarDemoAccion, moverDemoAccion } from "./acciones";
import { FORMULARIO_INICIAL, SIN_ERROR } from "./tipos";

const ID = "6528f0c2a1b2c3d4e5f60718";
const PROYECTO = "6528f0c2a1b2c3d4e5f60719";
const ADMIN = "6528f0c2a1b2c3d4e5f60001";
const SERVICIOS = [crearDemo, editarDemo, activarDemo, moverDemo, borrarDemo];

function form(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

const CAMPOS = { proyecto: PROYECTO, titulo: "Demo", url: "https://demo.example.com", descripcion: "" };

beforeEach(() => {
  for (const m of [requerirRol, updateTag, refresh, redirect, ...SERVICIOS]) m.mockClear();
  requerirRol.mockReset().mockResolvedValue({ id: ADMIN, rol: "admin" });
  for (const m of SERVICIOS) m.mockReset().mockResolvedValue({ ok: true, id: ID });
});

const ACCIONES = [
  {
    nombre: "guardarDemoAccion (crear)",
    correr: () => guardarDemoAccion(null, FORMULARIO_INICIAL, form(CAMPOS)),
    ruta: "/panel/demos/nueva",
    servicio: crearDemo,
  },
  {
    nombre: "guardarDemoAccion (editar)",
    correr: () => guardarDemoAccion(ID, FORMULARIO_INICIAL, form(CAMPOS)),
    ruta: `/panel/demos/${ID}`,
    servicio: editarDemo,
  },
  {
    nombre: "activarDemoAccion",
    correr: () => activarDemoAccion(SIN_ERROR, form({ id: ID, activa: "false" })),
    ruta: "/panel/demos",
    servicio: activarDemo,
  },
  {
    nombre: "moverDemoAccion",
    correr: () => moverDemoAccion(SIN_ERROR, form({ id: ID, direccion: "subir" })),
    ruta: "/panel/demos",
    servicio: moverDemo,
  },
  {
    nombre: "borrarDemoAccion",
    correr: () => borrarDemoAccion(SIN_ERROR, form({ id: ID })),
    ruta: "/panel/demos",
    servicio: borrarDemo,
  },
];

describe.each(ACCIONES)("$nombre: permisos", ({ correr, ruta, servicio }) => {
  it("exige admin (y solo admin), con la ruta para volver", async () => {
    await correr().catch(() => {});
    expect(requerirRol).toHaveBeenCalledWith(ruta, "admin");
  });

  it("un operador (requerirRol lanza 403) no puede llamarla: no escribe ni invalida nada", async () => {
    requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(correr()).rejects.toThrow("403");
    expect(servicio).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("si salió bien, invalida el contenido del sitio (se ve sin redeploy)", async () => {
    await correr().catch(() => {});
    expect(servicio).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledWith(TAG_CONTENIDO);
  });

  it("si el servicio rechaza, no invalida nada", async () => {
    servicio.mockResolvedValue({ ok: false, error: "no-encontrado", mensaje: "No existe." });
    await correr().catch(() => {});
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("guardarDemoAccion", () => {
  it("pasa los campos del formulario; activa sale del checkbox", async () => {
    await guardarDemoAccion(ID, FORMULARIO_INICIAL, form({ ...CAMPOS, activa: "on" })).catch(() => {});
    expect(editarDemo).toHaveBeenCalledWith(ID, { ...CAMPOS, activa: true });
    await guardarDemoAccion(null, FORMULARIO_INICIAL, form(CAMPOS)).catch(() => {});
    expect(crearDemo).toHaveBeenCalledWith({ ...CAMPOS, activa: false });
  });

  it("si salió bien vuelve a la lista", async () => {
    await expect(guardarDemoAccion(null, FORMULARIO_INICIAL, form(CAMPOS))).rejects.toThrow("NEXT_REDIRECT;/panel/demos");
  });

  it("si falló devuelve el mensaje, los errores por campo, lo que se mandó y un envío más", async () => {
    crearDemo.mockResolvedValue({
      ok: false,
      error: "invalido",
      mensaje: "Revisá los campos marcados.",
      campos: { proyecto: "El proyecto no existe." } as Record<string, string>,
    });
    const r = await guardarDemoAccion(null, { error: "x", campos: {}, envio: 3 }, form({ ...CAMPOS, activa: "on" }));
    expect(r).toEqual({
      error: "Revisá los campos marcados.",
      campos: { proyecto: "El proyecto no existe." } as Record<string, string>,
      valores: { ...CAMPOS, activa: true },
      envio: 4,
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("acciones de la lista", () => {
  const LISTA = [
    {
      nombre: "activarDemoAccion",
      correr: (c: Record<string, string>) => activarDemoAccion(SIN_ERROR, form(c)),
      campos: { id: ID, activa: "true" } as Record<string, string>,
      servicio: activarDemo,
      args: [ID, true],
    },
    {
      nombre: "moverDemoAccion",
      correr: (c: Record<string, string>) => moverDemoAccion(SIN_ERROR, form(c)),
      campos: { id: ID, direccion: "bajar" } as Record<string, string>,
      servicio: moverDemo,
      args: [ID, "bajar"],
    },
    {
      nombre: "borrarDemoAccion",
      correr: (c: Record<string, string>) => borrarDemoAccion(SIN_ERROR, form(c)),
      campos: { id: ID } as Record<string, string>,
      servicio: borrarDemo,
      args: [ID],
    },
  ];

  it.each(LISTA)("$nombre: pasa el id y el valor del formulario, refresca y no devuelve error", async ({ correr, campos, servicio, args }) => {
    expect(await correr(campos)).toEqual({ error: null });
    expect(servicio).toHaveBeenCalledWith(...args);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each(LISTA)("$nombre: si el servicio rechaza, devuelve el mensaje (no falla en silencio)", async ({ correr, campos, servicio }) => {
    servicio.mockResolvedValue({ ok: false, error: "no-encontrado", mensaje: "No existe." });
    expect(await correr(campos)).toEqual({ error: "No existe." });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it.each(LISTA)("$nombre: si lo que cambió es la pantalla vieja (no existe), refresca igual para mostrar la lista real", async ({ correr, campos, servicio }) => {
    servicio.mockResolvedValue({ ok: false, error: "no-encontrado", mensaje: "No existe." });
    await correr(campos);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each(LISTA)("$nombre: sin id en el formulario, el servicio recibe una cadena vacía y decide", async ({ correr, servicio }) => {
    servicio.mockResolvedValue({ ok: false, error: "no-encontrado", mensaje: "No existe." });
    expect(await correr({})).toEqual({ error: "No existe." });
    expect(servicio.mock.calls[0][0]).toBe("");
  });

  it("activarDemoAccion: el valor que no es true ni false llega crudo al servicio, que lo rechaza", async () => {
    activarDemo.mockResolvedValue({ ok: false, error: "invalido", mensaje: "Valor inválido." });
    expect(await activarDemoAccion(SIN_ERROR, form({ id: ID, activa: "quizas" }))).toEqual({ error: "Valor inválido." });
    expect(activarDemo).toHaveBeenCalledWith(ID, "quizas");
    expect(activarDemo.mock.calls[0][1]).not.toBe(false);
  });

  it("activarDemoAccion: false llega como booleano false", async () => {
    await activarDemoAccion(SIN_ERROR, form({ id: ID, activa: "false" }));
    expect(activarDemo).toHaveBeenCalledWith(ID, false);
  });

  it.each(LISTA)("$nombre: si el servicio rechaza por un valor inválido, devuelve el mensaje y no refresca", async ({ correr, campos, servicio }) => {
    servicio.mockResolvedValue({ ok: false, error: "invalido", mensaje: "Valor inválido." });
    expect(await correr(campos)).toEqual({ error: "Valor inválido." });
    expect(refresh).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
