import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// `use cache` no corre en Vitest: listarServicios (la landing) lee directo de la base.
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { Servicio } from "@/models/Servicio";
import { listarServicios } from "./contenido";
import { conectar, desconectar } from "./db";
import {
  borrarServicio,
  crearServicio,
  editarServicio,
  listarServiciosAdmin,
  moverServicio,
  obtenerServicioAdmin,
  publicarServicio,
  type EntradaServicio,
} from "./servicios-admin";

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  await desconectar();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test-servicios-admin";
}, 120_000);

beforeEach(async () => {
  await conectar();
  await Servicio.deleteMany({});
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

const ID_INEXISTENTE = "6528f0c2a1b2c3d4e5f60718";

function entrada(extra: EntradaServicio = {}): EntradaServicio {
  return {
    titulo: "Frontend",
    descripcion: "Interfaces en Next.js.",
    ilustracion: "icono",
    icono: "frontend",
    imagen: "",
    publicado: true,
    ...extra,
  };
}

async function crear(extra: EntradaServicio = {}): Promise<string> {
  const r = await crearServicio(entrada(extra));
  if (!r.ok) throw new Error(`no se creó: ${r.mensaje}`);
  return r.id;
}

async function titulosEnOrden(): Promise<string[]> {
  return (await listarServiciosAdmin()).map((s) => s.titulo);
}

describe("validaciones", () => {
  it("el título va de 1 a 40 caracteres", async () => {
    for (const titulo of ["", "   ", "x".repeat(41)]) {
      const r = await crearServicio(entrada({ titulo }));
      expect(r).toMatchObject({ ok: false, error: "invalido" });
      expect(r.ok ? null : r.campos?.titulo).toBeTruthy();
    }
    expect(await crearServicio(entrada({ titulo: "x".repeat(40) }))).toMatchObject({ ok: true });
  });

  it("la descripción va de 1 a 200 caracteres", async () => {
    for (const descripcion of ["", "x".repeat(201)]) {
      const r = await crearServicio(entrada({ descripcion }));
      expect(r).toMatchObject({ ok: false, error: "invalido" });
      expect(r.ok ? null : r.campos?.descripcion).toBeTruthy();
    }
    expect(await crearServicio(entrada({ descripcion: "x".repeat(200) }))).toMatchObject({ ok: true });
  });

  it("el ícono tiene que ser uno de los actuales", async () => {
    const r = await crearServicio(entrada({ icono: "cohete" }));
    expect(r).toMatchObject({ ok: false, error: "invalido" });
    expect(r.ok ? null : r.campos?.icono).toBeTruthy();
  });

  it("con imagen, la URL tiene que ser https (nada de http, javascript: ni vacía)", async () => {
    for (const imagen of ["", "http://x.com/a.png", "javascript:alert(1)"]) {
      const r = await crearServicio(entrada({ ilustracion: "imagen", icono: "", imagen }));
      expect(r).toMatchObject({ ok: false, error: "invalido" });
      expect(r.ok ? null : r.campos?.imagen).toBeTruthy();
    }
    expect(await Servicio.countDocuments()).toBe(0);
  });

  it("guarda solo la ilustración elegida: el ícono o la imagen, nunca los dos", async () => {
    const conIcono = await crear({ imagen: "https://blob.example/a.png" });
    expect(await obtenerServicioAdmin(conIcono)).toMatchObject({ icono: "frontend", imagen: undefined });

    const conImagen = await crear({ titulo: "Otro", ilustracion: "imagen", imagen: "https://blob.example/b.png" });
    expect(await obtenerServicioAdmin(conImagen)).toMatchObject({ icono: undefined, imagen: "https://blob.example/b.png" });
  });

  it("recorta los espacios del título y la descripción", async () => {
    const id = await crear({ titulo: "  Backend  ", descripcion: "  APIs.  " });
    expect(await obtenerServicioAdmin(id)).toMatchObject({ titulo: "Backend", descripcion: "APIs." });
  });
});

describe("crear y editar", () => {
  it("un servicio nuevo va al final del orden", async () => {
    await crear({ titulo: "A" });
    await crear({ titulo: "B" });
    await crear({ titulo: "C" });
    expect(await titulosEnOrden()).toEqual(["A", "B", "C"]);
  });

  it("un título repetido da un error claro, al crear y al editar (índice único)", async () => {
    await crear({ titulo: "Frontend" });
    const otro = await crear({ titulo: "Backend" });

    const alCrear = await crearServicio(entrada({ titulo: "Frontend" }));
    expect(alCrear).toMatchObject({ ok: false, error: "duplicado" });
    expect(alCrear.ok ? null : alCrear.campos?.titulo).toMatch(/ya hay un servicio/i);

    const alEditar = await editarServicio(otro, entrada({ titulo: "Frontend" }));
    expect(alEditar).toMatchObject({ ok: false, error: "duplicado" });
    expect(await Servicio.countDocuments({ titulo: "Frontend" })).toBe(1);
  });

  it("editar cambia de ícono a imagen y de imagen a ícono (valida el documento, no la query)", async () => {
    const id = await crear();
    const aImagen = await editarServicio(id, entrada({ ilustracion: "imagen", icono: "", imagen: "https://blob.example/c.png" }));
    expect(aImagen).toEqual({ ok: true, id });
    expect(await obtenerServicioAdmin(id)).toMatchObject({ icono: undefined, imagen: "https://blob.example/c.png" });

    const aIcono = await editarServicio(id, entrada({ icono: "deploy" }));
    expect(aIcono).toEqual({ ok: true, id });
    const doc = await Servicio.findById(id).lean();
    expect(doc).toMatchObject({ icono: "deploy" });
    expect(doc).not.toHaveProperty("imagen");
  });

  it("editar mantiene el orden y cambia el título, la descripción y si está publicado", async () => {
    await crear({ titulo: "A" });
    const id = await crear({ titulo: "B" });
    await editarServicio(id, entrada({ titulo: "B2", descripcion: "Nueva", publicado: false }));
    expect(await listarServiciosAdmin()).toMatchObject([
      { titulo: "A" },
      { id, titulo: "B2", descripcion: "Nueva", publicado: false, orden: 1 },
    ]);
  });

  it("editar con datos inválidos no toca el documento", async () => {
    const id = await crear();
    expect(await editarServicio(id, entrada({ titulo: "" }))).toMatchObject({ ok: false, error: "invalido" });
    expect(await obtenerServicioAdmin(id)).toMatchObject({ titulo: "Frontend" });
  });

  it("un id inválido o inexistente es no-encontrado", async () => {
    for (const id of ["no-es-un-id", ID_INEXISTENTE]) {
      expect(await editarServicio(id, entrada())).toMatchObject({ ok: false, error: "no-encontrado" });
      expect(await borrarServicio(id)).toMatchObject({ ok: false, error: "no-encontrado" });
      expect(await publicarServicio(id, false)).toMatchObject({ ok: false, error: "no-encontrado" });
      expect(await moverServicio(id, "subir")).toMatchObject({ ok: false, error: "no-encontrado" });
      expect(await obtenerServicioAdmin(id)).toBeNull();
    }
  });
});

describe("ordenar", () => {
  it("subir y bajar intercambian con el vecino", async () => {
    await crear({ titulo: "A" });
    const b = await crear({ titulo: "B" });
    await crear({ titulo: "C" });

    expect(await moverServicio(b, "subir")).toEqual({ ok: true, id: b });
    expect(await titulosEnOrden()).toEqual(["B", "A", "C"]);
    await moverServicio(b, "bajar");
    await moverServicio(b, "bajar");
    expect(await titulosEnOrden()).toEqual(["A", "C", "B"]);
  });

  it("en los extremos no hace nada", async () => {
    const a = await crear({ titulo: "A" });
    const b = await crear({ titulo: "B" });
    expect(await moverServicio(a, "subir")).toEqual({ ok: true, id: a });
    expect(await moverServicio(b, "bajar")).toEqual({ ok: true, id: b });
    expect(await titulosEnOrden()).toEqual(["A", "B"]);
  });

  it("con órdenes repetidos (todos en 0) también mueve uno solo", async () => {
    await Servicio.create([
      { titulo: "A", descripcion: "x", icono: "deploy", orden: 0 },
      { titulo: "B", descripcion: "x", icono: "deploy", orden: 0 },
      { titulo: "C", descripcion: "x", icono: "deploy", orden: 0 },
    ]);
    const c = (await listarServiciosAdmin()).at(2)?.id ?? "";
    await moverServicio(c, "subir");
    expect(await titulosEnOrden()).toEqual(["A", "C", "B"]);
  });

  it("una dirección inválida se rechaza", async () => {
    const a = await crear({ titulo: "A" });
    expect(await moverServicio(a, "arriba")).toMatchObject({ ok: false, error: "invalido" });
  });
});

describe("publicar, borrar y la landing", () => {
  it("un servicio despublicado no aparece en la landing; al publicarlo vuelve", async () => {
    await crear({ titulo: "Visible" });
    const id = await crear({ titulo: "Oculto" });

    expect(await publicarServicio(id, false)).toEqual({ ok: true, id });
    expect((await listarServicios()).map((s) => s.titulo)).toEqual(["Visible"]);
    expect((await listarServiciosAdmin()).map((s) => [s.titulo, s.publicado])).toEqual([
      ["Visible", true],
      ["Oculto", false],
    ]);

    await publicarServicio(id, true);
    expect((await listarServicios()).map((s) => s.titulo)).toEqual(["Visible", "Oculto"]);
  });

  it("la landing muestra los publicados en el orden del panel", async () => {
    await crear({ titulo: "A" });
    const b = await crear({ titulo: "B" });
    await moverServicio(b, "subir");
    expect((await listarServicios()).map((s) => s.titulo)).toEqual(["B", "A"]);
  });

  it("publicado tiene que ser un booleano", async () => {
    const id = await crear();
    expect(await publicarServicio(id, "false")).toMatchObject({ ok: false, error: "invalido" });
    expect(await obtenerServicioAdmin(id)).toMatchObject({ publicado: true });
  });

  it("borrar lo saca de la lista", async () => {
    const id = await crear();
    expect(await borrarServicio(id)).toEqual({ ok: true, id });
    expect(await listarServiciosAdmin()).toEqual([]);
  });
});
