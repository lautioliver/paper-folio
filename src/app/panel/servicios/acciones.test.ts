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
import { FORMULARIO_INICIAL } from "./tipos";

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
    correr: () => publicarServicioAccion(ID, false),
    ruta: "/panel/servicios",
    servicio: publicarServicio,
  },
  {
    nombre: "moverServicioAccion",
    correr: () => moverServicioAccion(ID, "subir"),
    ruta: "/panel/servicios",
    servicio: moverServicio,
  },
  {
    nombre: "borrarServicioAccion",
    correr: () => borrarServicioAccion(ID),
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
      campos: { titulo: "Ya hay un servicio con ese título." },
    });
    const r = await guardarServicioAccion(null, FORMULARIO_INICIAL, form(CAMPOS));
    expect(r).toEqual({
      error: "Revisá los campos marcados.",
      campos: { titulo: "Ya hay un servicio con ese título." },
      valores: { ...CAMPOS, publicado: false },
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("acciones de la lista", () => {
  it("pasan el id y el valor, y refrescan la lista", async () => {
    await publicarServicioAccion(ID, true);
    expect(publicarServicio).toHaveBeenCalledWith(ID, true);
    await moverServicioAccion(ID, "bajar");
    expect(moverServicio).toHaveBeenCalledWith(ID, "bajar");
    await borrarServicioAccion(ID);
    expect(borrarServicio).toHaveBeenCalledWith(ID);
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});
