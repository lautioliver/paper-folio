import { beforeEach, describe, expect, it, vi } from "vitest";

// Las acciones no pueden importar `@/auth` en Vitest: se mockean los permisos, el servicio y next/cache.
const requerirRol = vi.fn();
const crearServicio = vi.fn();
const editarServicio = vi.fn();
const publicarServicio = vi.fn();
const moverServicio = vi.fn();
const borrarServicio = vi.fn();
const updateTag = vi.fn();
const refresh = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT;${url}`);
});
vi.mock("@/lib/permisos", () => ({ requerirRol: (...a: unknown[]) => requerirRol(...a) }));
vi.mock("@/lib/servicios-admin", () => ({
  crearServicio: (...a: unknown[]) => crearServicio(...a),
  editarServicio: (...a: unknown[]) => editarServicio(...a),
  publicarServicio: (...a: unknown[]) => publicarServicio(...a),
  moverServicio: (...a: unknown[]) => moverServicio(...a),
  borrarServicio: (...a: unknown[]) => borrarServicio(...a),
}));
vi.mock("next/cache", () => ({
  updateTag: (t: string) => updateTag(t),
  refresh: () => refresh(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));

import { TAG_CONTENIDO } from "@/lib/contenido";
import { borrarServicioAccion, guardarServicioAccion, moverServicioAccion, publicarServicioAccion } from "./acciones";
import { FORMULARIO_INICIAL, SIN_ERROR } from "./tipos";

const ID = "6528f0c2a1b2c3d4e5f60718";
const ADMIN = "6528f0c2a1b2c3d4e5f60001";
const SERVICIOS = [crearServicio, editarServicio, publicarServicio, moverServicio, borrarServicio];

function form(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

const CAMPOS = { titulo: "Frontend", descripcion: "Interfaces", ilustracion: "icono", icono: "frontend", imagen: "" };

beforeEach(() => {
  for (const m of [requerirRol, updateTag, refresh, redirect, ...SERVICIOS]) m.mockClear();
  requerirRol.mockReset().mockResolvedValue({ id: ADMIN, rol: "admin" });
  for (const m of SERVICIOS) m.mockReset().mockResolvedValue({ ok: true, id: ID });
});

const ACCIONES = [
  {
    nombre: "guardarServicioAccion (crear)",
    correr: () => guardarServicioAccion(null, FORMULARIO_INICIAL, form(CAMPOS)),
    ruta: "/panel/servicios/nuevo",
    servicio: crearServicio,
  },
  {
    nombre: "guardarServicioAccion (editar)",
    correr: () => guardarServicioAccion(ID, FORMULARIO_INICIAL, form(CAMPOS)),
    ruta: `/panel/servicios/${ID}`,
    servicio: editarServicio,
  },
  {
    nombre: "publicarServicioAccion",
    correr: () => publicarServicioAccion(SIN_ERROR, form({ id: ID, publicado: "false" })),
    ruta: "/panel/servicios",
    servicio: publicarServicio,
  },
  {
    nombre: "moverServicioAccion",
    correr: () => moverServicioAccion(SIN_ERROR, form({ id: ID, direccion: "subir" })),
    ruta: "/panel/servicios",
    servicio: moverServicio,
  },
  {
    nombre: "borrarServicioAccion",
    correr: () => borrarServicioAccion(SIN_ERROR, form({ id: ID })),
    ruta: "/panel/servicios",
    servicio: borrarServicio,
  },
];

describe.each(ACCIONES)("$nombre: permisos", ({ correr, ruta, servicio }) => {
  it("exige admin (y solo admin), con la ruta para volver", async () => {
    await correr().catch(() => {});
    expect(requerirRol).toHaveBeenCalledWith(ruta, "admin");
  });

  it("si requerirRol lanza (un operador, o sin sesión), no escribe ni invalida nada", async () => {
    requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(correr()).rejects.toThrow("403");
    expect(servicio).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("si salió bien, invalida el contenido del sitio (tag de la landing)", async () => {
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

describe("guardarServicioAccion", () => {
  it("pasa los campos del formulario; publicado sale del checkbox", async () => {
    await guardarServicioAccion(ID, FORMULARIO_INICIAL, form({ ...CAMPOS, publicado: "on" })).catch(() => {});
    expect(editarServicio).toHaveBeenCalledWith(ID, { ...CAMPOS, publicado: true });
    await guardarServicioAccion(null, FORMULARIO_INICIAL, form(CAMPOS)).catch(() => {});
    expect(crearServicio).toHaveBeenCalledWith({ ...CAMPOS, publicado: false });
  });

  it("si salió bien vuelve a la lista", async () => {
    await expect(guardarServicioAccion(null, FORMULARIO_INICIAL, form(CAMPOS))).rejects.toThrow(
      "NEXT_REDIRECT;/panel/servicios",
    );
  });

  it("si falló devuelve el mensaje, los errores por campo y lo que se mandó", async () => {
    crearServicio.mockResolvedValue({
      ok: false,
      error: "duplicado",
      mensaje: "Revisá los campos marcados.",
      campos: { titulo: "Ya hay un servicio con ese título." } as Record<string, string>,
    });
    const r = await guardarServicioAccion(null, FORMULARIO_INICIAL, form(CAMPOS));
    expect(r).toEqual({
      error: "Revisá los campos marcados.",
      campos: { titulo: "Ya hay un servicio con ese título." } as Record<string, string>,
      valores: { ...CAMPOS, publicado: false },
      envio: 1,
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("cada respuesta fallida suma un envío (el formulario se vuelve a montar con los valores devueltos)", async () => {
    crearServicio.mockResolvedValue({ ok: false, error: "invalido", mensaje: "x", campos: {} });
    const conImagen = { ...CAMPOS, ilustracion: "imagen", icono: "", imagen: "https://blob.example/a.png" };
    const r = await guardarServicioAccion(null, { error: "x", campos: {}, envio: 3 }, form(conImagen));
    expect(r.envio).toBe(4);
    expect(r.valores).toEqual({ ...conImagen, publicado: false });
  });
});

describe("acciones de la lista", () => {
  const LISTA = [
    {
      nombre: "publicarServicioAccion",
      correr: (c: Record<string, string>) => publicarServicioAccion(SIN_ERROR, form(c)),
      campos: { id: ID, publicado: "true" } as Record<string, string>,
      servicio: publicarServicio,
      args: [ID, true],
    },
    {
      nombre: "moverServicioAccion",
      correr: (c: Record<string, string>) => moverServicioAccion(SIN_ERROR, form(c)),
      campos: { id: ID, direccion: "bajar" } as Record<string, string>,
      servicio: moverServicio,
      args: [ID, "bajar"],
    },
    {
      nombre: "borrarServicioAccion",
      correr: (c: Record<string, string>) => borrarServicioAccion(SIN_ERROR, form(c)),
      campos: { id: ID } as Record<string, string>,
      servicio: borrarServicio,
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
});
