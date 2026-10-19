import { beforeEach, describe, expect, it, vi } from "vitest";

// Las acciones no pueden importar `@/auth` en Vitest: se mockean los permisos, el servicio y next/cache.
const requerirRol = vi.fn();
const servicio = {
  crearProyecto: vi.fn(),
  actualizarProyecto: vi.fn(),
  borrarProyecto: vi.fn(),
  publicarProyecto: vi.fn(),
  reordenar: vi.fn(),
};
const updateTag = vi.fn();
const refresh = vi.fn();
const redirect = vi.fn((ruta: string) => {
  throw new Error(`NEXT_REDIRECT;${ruta}`);
});
vi.mock("@/lib/permisos", () => ({ requerirRol: (...a: unknown[]) => requerirRol(...a) }));
vi.mock("@/lib/proyectos-admin", () => ({
  crearProyecto: (...a: unknown[]) => servicio.crearProyecto(...a),
  actualizarProyecto: (...a: unknown[]) => servicio.actualizarProyecto(...a),
  borrarProyecto: (...a: unknown[]) => servicio.borrarProyecto(...a),
  publicarProyecto: (...a: unknown[]) => servicio.publicarProyecto(...a),
  reordenar: (...a: unknown[]) => servicio.reordenar(...a),
}));
vi.mock("next/cache", () => ({
  updateTag: (t: string) => updateTag(t),
  refresh: () => refresh(),
}));
vi.mock("next/navigation", () => ({ redirect: (r: string) => redirect(r) }));

import { TAG_CONTENIDO } from "@/lib/contenido";
import {
  actualizarProyectoAccion,
  borrarProyectoAccion,
  crearProyectoAccion,
  publicarProyectoAccion,
  reordenarProyectosAccion,
} from "./acciones";
import { FORMULARIO_INICIAL, SIN_ERROR } from "./tipos";

const ID = "6528f0c2a1b2c3d4e5f60718";
const OTRO = "6528f0c2a1b2c3d4e5f60719";

function form(campos: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

const formulario = () => form({ slug: "nuevo", nombre: "Nuevo", stack: "Next.js\nMongoDB", publicado: "on" });

beforeEach(() => {
  for (const m of [requerirRol, updateTag, refresh, redirect, ...Object.values(servicio)]) m.mockClear();
  requerirRol.mockReset();
  requerirRol.mockResolvedValue({ id: "admin-1", rol: "admin" });
  for (const m of Object.values(servicio)) m.mockReset().mockResolvedValue({ ok: true, id: ID });
});

const ACCIONES = [
  {
    nombre: "crearProyectoAccion",
    volverA: "/panel/proyectos/nuevo",
    correr: () => crearProyectoAccion(FORMULARIO_INICIAL, formulario()),
    llamado: servicio.crearProyecto,
  },
  {
    nombre: "actualizarProyectoAccion",
    volverA: `/panel/proyectos/${ID}`,
    correr: () => actualizarProyectoAccion(ID, FORMULARIO_INICIAL, formulario()),
    llamado: servicio.actualizarProyecto,
  },
  {
    nombre: "borrarProyectoAccion",
    volverA: "/panel/proyectos",
    correr: () => borrarProyectoAccion(SIN_ERROR, form({ id: ID })),
    llamado: servicio.borrarProyecto,
  },
  {
    nombre: "publicarProyectoAccion",
    volverA: "/panel/proyectos",
    correr: () => publicarProyectoAccion(ID, true, SIN_ERROR),
    llamado: servicio.publicarProyecto,
  },
  {
    nombre: "reordenarProyectosAccion",
    volverA: "/panel/proyectos",
    correr: () => reordenarProyectosAccion(SIN_ERROR, form({ orden: [OTRO, ID] })),
    llamado: servicio.reordenar,
  },
];

describe.each(ACCIONES)("$nombre: permisos", ({ volverA, correr, llamado }) => {
  it("exige admin (solo admin), con la ruta a la que volver", async () => {
    await correr().catch(() => {});
    expect(requerirRol).toHaveBeenCalledWith(volverA, "admin");
  });

  it("un operador (requerirRol lanza 403) no escribe ni invalida nada, aunque llame la acción directo", async () => {
    requerirRol.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));
    await expect(correr()).rejects.toThrow("403");
    expect(llamado).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("si sale bien, invalida el contenido del sitio (tag contenido)", async () => {
    await correr().catch(() => {});
    expect(llamado).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledWith(TAG_CONTENIDO);
  });

  it("si el servicio rechaza, devuelve el mensaje y no invalida nada", async () => {
    llamado.mockResolvedValue({ ok: false, error: "no-encontrado", mensaje: "El proyecto no existe." });
    const r = await correr();
    expect(r.error).toBe("El proyecto no existe.");
    expect(updateTag).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("crearProyectoAccion y actualizarProyectoAccion", () => {
  it("pasan los datos del formulario al servicio y, si salió bien, vuelven a la lista", async () => {
    await expect(crearProyectoAccion(FORMULARIO_INICIAL, formulario())).rejects.toThrow("NEXT_REDIRECT;/panel/proyectos");
    expect(servicio.crearProyecto).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "nuevo", stack: ["Next.js", "MongoDB"], publicado: true }),
    );
    await expect(actualizarProyectoAccion(ID, FORMULARIO_INICIAL, formulario())).rejects.toThrow(
      "NEXT_REDIRECT;/panel/proyectos",
    );
    expect(servicio.actualizarProyecto).toHaveBeenCalledWith(ID, expect.objectContaining({ slug: "nuevo" }));
  });

  it("con errores por campo, los devuelve junto con lo que se mandó y un intento nuevo", async () => {
    servicio.crearProyecto.mockResolvedValue({
      ok: false,
      error: "invalida",
      mensaje: "Revisá los campos marcados.",
      campos: { slug: "Ya hay un proyecto con ese slug." },
    });
    const r = await crearProyectoAccion(FORMULARIO_INICIAL, formulario());
    expect(r.campos).toEqual({ slug: "Ya hay un proyecto con ese slug." });
    expect(r.valores).toMatchObject({ slug: "nuevo", nombre: "Nuevo", stack: "Next.js\nMongoDB", publicado: true });
    expect(r.intento).toBe(FORMULARIO_INICIAL.intento + 1);
  });
});

describe("acciones de la lista", () => {
  it("refrescan la lista cuando salen bien", async () => {
    await borrarProyectoAccion(SIN_ERROR, form({ id: ID }));
    await publicarProyectoAccion(ID, false, SIN_ERROR);
    await reordenarProyectosAccion(SIN_ERROR, form({ orden: [OTRO, ID] }));
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("publicar pasa el valor de publicado; reordenar, los ids en el orden del formulario", async () => {
    await publicarProyectoAccion(ID, false, SIN_ERROR);
    expect(servicio.publicarProyecto).toHaveBeenCalledWith(ID, false);
    await reordenarProyectosAccion(SIN_ERROR, form({ orden: [OTRO, ID] }));
    expect(servicio.reordenar).toHaveBeenCalledWith([OTRO, ID]);
  });
});

describe("acciones de la lista con la pantalla vieja", () => {
  it("si el proyecto ya no existe o la lista cambió, devuelven el mensaje y refrescan para mostrar la lista real", async () => {
    servicio.borrarProyecto.mockResolvedValue({ ok: false, error: "no-encontrado", mensaje: "El proyecto no existe." });
    servicio.publicarProyecto.mockResolvedValue({ ok: false, error: "no-encontrado", mensaje: "El proyecto no existe." });
    servicio.reordenar.mockResolvedValue({ ok: false, error: "desactualizada", mensaje: "La lista cambió." });
    expect(await borrarProyectoAccion(SIN_ERROR, form({ id: ID }))).toEqual({ error: "El proyecto no existe." });
    expect(await publicarProyectoAccion(ID, true, SIN_ERROR)).toEqual({ error: "El proyecto no existe." });
    expect(await reordenarProyectosAccion(SIN_ERROR, form({ orden: [ID] }))).toEqual({ error: "La lista cambió." });
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("borrarProyectoAccion", () => {
  it("toma el id del formulario (la lista entera comparte la acción, así el aviso no se va con la fila)", async () => {
    await borrarProyectoAccion(SIN_ERROR, form({ id: ID }));
    expect(servicio.borrarProyecto).toHaveBeenCalledWith(ID);
  });

  it("si el proyecto se borró pero quedaron demos, invalida el sitio, refresca y devuelve el aviso", async () => {
    servicio.borrarProyecto.mockResolvedValue({ ok: true, aviso: "Se borró el proyecto, pero quedaron demos sin borrar." });
    const r = await borrarProyectoAccion(SIN_ERROR, form({ id: ID }));
    expect(r).toEqual({ error: "Se borró el proyecto, pero quedaron demos sin borrar." });
    expect(updateTag).toHaveBeenCalledWith(TAG_CONTENIDO);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("si el servicio lanza (no se sabe si borró), invalida el sitio igual y deja pasar el error", async () => {
    servicio.borrarProyecto.mockRejectedValue(new Error("MongoNetworkError"));
    await expect(borrarProyectoAccion(SIN_ERROR, form({ id: ID }))).rejects.toThrow("MongoNetworkError");
    expect(updateTag).toHaveBeenCalledWith(TAG_CONTENIDO);
  });
});
