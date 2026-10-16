import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// `use cache` no corre en Vitest: detalleProyecto (el detalle público) lee directo de la base.
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { Types } from "mongoose";
import { Demo } from "@/models/Demo";
import { Proyecto } from "@/models/Proyecto";
import { detalleProyecto } from "./contenido";
import { conectar, desconectar } from "./db";
import {
  activarDemo,
  borrarDemo,
  crearDemo,
  editarDemo,
  listarDemosAdmin,
  moverDemo,
  obtenerDemoAdmin,
  proyectosParaDemos,
  type EntradaDemo,
} from "./demos-admin";

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  await desconectar();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test-demos-admin";
}, 120_000);

let uno: string;
let dos: string;

beforeEach(async () => {
  await conectar();
  await Promise.all([Proyecto.deleteMany({}), Demo.deleteMany({})]);
  const [a, b] = await Proyecto.create([proyectoDoc("uno", 0), proyectoDoc("dos", 1)]);
  uno = String(a._id);
  dos = String(b._id);
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

const ID_INEXISTENTE = "6528f0c2a1b2c3d4e5f60718";

function proyectoDoc(slug: string, orden: number) {
  return {
    slug,
    nombre: `Proyecto ${slug}`,
    inicial: "P",
    categoria: "Web",
    descripcion: "Descripción",
    stack: ["Next.js"],
    repoUrl: `https://github.com/lautioliver/${slug}`,
    acento: "primario" as const,
    caso: { problema: "Problema", solucion: "Solución", funcionalidades: ["Una"], stack: ["TS"] },
    publicado: true,
    orden,
  };
}

function entrada(extra: EntradaDemo = {}): EntradaDemo {
  return {
    proyecto: uno,
    titulo: "Demo principal",
    url: "https://demo.example.com",
    descripcion: "",
    activa: true,
    ...extra,
  };
}

async function crear(extra: EntradaDemo = {}): Promise<string> {
  const r = await crearDemo(entrada(extra));
  if (!r.ok) throw new Error(`no se creó: ${r.mensaje}`);
  return r.id;
}

async function titulosDe(proyecto: string): Promise<string[]> {
  const grupo = (await listarDemosAdmin()).find((g) => g.proyecto?.id === proyecto);
  return grupo ? grupo.demos.map((d) => d.titulo) : [];
}

describe("validaciones", () => {
  it("una demo con un proyecto inexistente da error y no se guarda", async () => {
    for (const proyecto of [ID_INEXISTENTE, "no-es-un-id", "", 42, undefined]) {
      const r = await crearDemo(entrada({ proyecto }));
      expect(r).toMatchObject({ ok: false, error: "invalido" });
      expect(r.ok ? null : r.campos?.proyecto).toBeTruthy();
    }
    expect(await Demo.countDocuments()).toBe(0);
  });

  it("editar hacia un proyecto inexistente también da error y no cambia nada", async () => {
    const id = await crear();
    const r = await editarDemo(id, entrada({ proyecto: ID_INEXISTENTE }));
    expect(r).toMatchObject({ ok: false, error: "invalido" });
    expect(r.ok ? null : r.campos?.proyecto).toBeTruthy();
    expect((await obtenerDemoAdmin(id))?.proyecto).toBe(uno);
  });

  it("la URL tiene que ser https (nada de http, javascript: ni data:)", async () => {
    for (const url of ["http://demo.example.com", "javascript:alert(1)", "data:text/html,<b>x</b>", "demo.example.com", ""]) {
      const r = await crearDemo(entrada({ url }));
      expect(r).toMatchObject({ ok: false, error: "invalido" });
      expect(r.ok ? null : r.campos?.url).toBeTruthy();
    }
    expect(await crearDemo(entrada({ url: "  https://ok.example.com/app  " }))).toMatchObject({ ok: true });
    expect((await Demo.findOne().lean())?.url).toBe("https://ok.example.com/app");
  });

  it("el título va de 1 a 80 caracteres", async () => {
    for (const titulo of ["", "   ", "x".repeat(81)]) {
      const r = await crearDemo(entrada({ titulo }));
      expect(r).toMatchObject({ ok: false, error: "invalido" });
      expect(r.ok ? null : r.campos?.titulo).toBeTruthy();
    }
    expect(await crearDemo(entrada({ titulo: "x".repeat(80) }))).toMatchObject({ ok: true });
  });

  it("la descripción es opcional y va hasta 300 caracteres", async () => {
    const r = await crearDemo(entrada({ descripcion: "x".repeat(301) }));
    expect(r).toMatchObject({ ok: false, error: "invalido" });
    expect(r.ok ? null : r.campos?.descripcion).toBeTruthy();
    expect(await crearDemo(entrada({ descripcion: "x".repeat(300) }))).toMatchObject({ ok: true });
    expect(await crearDemo(entrada({ descripcion: "" }))).toMatchObject({ ok: true });
  });

  it("activa tiene que ser booleano", async () => {
    expect(await crearDemo(entrada({ activa: "true" }))).toMatchObject({ ok: false, error: "invalido" });
  });

  it("con un id inválido o inexistente, editar, borrar, activar y mover dan no-encontrado", async () => {
    for (const id of ["x", ID_INEXISTENTE]) {
      expect(await editarDemo(id, entrada())).toMatchObject({ ok: false, error: "no-encontrado" });
      expect(await borrarDemo(id)).toMatchObject({ ok: false, error: "no-encontrado" });
      expect(await activarDemo(id, false)).toMatchObject({ ok: false, error: "no-encontrado" });
      expect(await moverDemo(id, "subir")).toMatchObject({ ok: false, error: "no-encontrado" });
      expect(await obtenerDemoAdmin(id)).toBeNull();
    }
  });
});

describe("el detalle público", () => {
  it("muestra las demos activas del proyecto, en el orden del panel", async () => {
    await crear({ titulo: "Primera", url: "https://a.example.com" });
    await crear({ titulo: "Segunda", url: "https://b.example.com", descripcion: "La otra" });
    await crear({ titulo: "De otro", url: "https://c.example.com", proyecto: dos });
    expect((await detalleProyecto("uno"))?.demos).toEqual([
      { titulo: "Primera", url: "https://a.example.com", descripcion: "" },
      { titulo: "Segunda", url: "https://b.example.com", descripcion: "La otra" },
    ]);
  });

  it("desactivar una demo la saca del detalle; activarla la vuelve a mostrar", async () => {
    const id = await crear({ titulo: "Primera" });
    await crear({ titulo: "Segunda", url: "https://b.example.com" });
    expect(await activarDemo(id, false)).toEqual({ ok: true, id });
    expect((await detalleProyecto("uno"))?.demos.map((d) => d.titulo)).toEqual(["Segunda"]);
    expect(await activarDemo(id, true)).toEqual({ ok: true, id });
    expect((await detalleProyecto("uno"))?.demos.map((d) => d.titulo)).toEqual(["Primera", "Segunda"]);
  });

  it("una demo creada inactiva no aparece; activar con un valor no booleano no cambia nada", async () => {
    const id = await crear({ activa: false });
    expect((await detalleProyecto("uno"))?.demos).toEqual([]);
    expect(await activarDemo(id, "si")).toMatchObject({ ok: false, error: "invalido" });
    expect((await obtenerDemoAdmin(id))?.activa).toBe(false);
  });

  it("subir o bajar una demo cambia el orden del detalle", async () => {
    await crear({ titulo: "A" });
    const b = await crear({ titulo: "B", url: "https://b.example.com" });
    await moverDemo(b, "subir");
    expect((await detalleProyecto("uno"))?.demos.map((d) => d.titulo)).toEqual(["B", "A"]);
  });
});

describe("listar y obtener", () => {
  it("agrupa por proyecto, en el orden de los proyectos, y deja fuera los proyectos sin demos", async () => {
    await crear({ titulo: "De dos", proyecto: dos });
    await crear({ titulo: "De uno" });
    const grupos = await listarDemosAdmin();
    expect(grupos.map((g) => g.proyecto)).toEqual([
      { id: uno, nombre: "Proyecto uno" },
      { id: dos, nombre: "Proyecto dos" },
    ]);
    expect(grupos[0].demos[0]).toMatchObject({ titulo: "De uno", proyecto: uno, activa: true, url: "https://demo.example.com" });
  });

  it("las demos sin proyecto (huérfanas) van al final, en un grupo sin proyecto, para poder borrarlas", async () => {
    await Demo.create({ proyecto: ID_INEXISTENTE, titulo: "Huérfana", url: "https://h.example.com" });
    await crear();
    const grupos = await listarDemosAdmin();
    expect(grupos.at(-1)).toMatchObject({ proyecto: null, demos: [{ titulo: "Huérfana" }] });
  });

  it("los proyectos para elegir: todos (publicados o no), en orden", async () => {
    await Proyecto.updateOne({ _id: dos }, { $set: { publicado: false } });
    expect(await proyectosParaDemos()).toEqual([
      { id: uno, nombre: "Proyecto uno" },
      { id: dos, nombre: "Proyecto dos" },
    ]);
  });
});

describe("índices (ADR-003)", () => {
  it("crear una demo en una base sin seed crea el índice del detalle", async () => {
    await Demo.collection.drop().catch(() => {});
    // Los índices se aseguran una vez por conexión: reconectar simula un proceso nuevo contra esta base.
    await desconectar();
    await conectar();
    await crear();
    const nombres = (await Demo.collection.indexes()).map((i) => i.name);
    expect(nombres).toContain("proyecto_1_activa_1_orden_1");
  });
});

describe("orden", () => {
  it("una demo nueva va al final de las de su proyecto", async () => {
    await crear({ titulo: "A" });
    await crear({ titulo: "X", proyecto: dos });
    await crear({ titulo: "B" });
    expect(await titulosDe(uno)).toEqual(["A", "B"]);
  });

  it("subir y bajar mueven solo dentro del proyecto; en los extremos no hace nada", async () => {
    const a = await crear({ titulo: "A" });
    const b = await crear({ titulo: "B" });
    const c = await crear({ titulo: "C" });
    const x = await crear({ titulo: "X", proyecto: dos });
    expect(await moverDemo(c, "subir")).toEqual({ ok: true, id: c });
    expect(await titulosDe(uno)).toEqual(["A", "C", "B"]);
    expect(await moverDemo(a, "subir")).toEqual({ ok: true, id: a });
    expect(await moverDemo(b, "bajar")).toEqual({ ok: true, id: b });
    expect(await moverDemo(x, "subir")).toEqual({ ok: true, id: x });
    expect(await titulosDe(uno)).toEqual(["A", "C", "B"]);
    expect(await titulosDe(dos)).toEqual(["X"]);
    expect(await moverDemo(a, "costado")).toMatchObject({ ok: false, error: "invalido" });
  });

  it("con órdenes repetidos (todas en 0), mover igual intercambia", async () => {
    await Demo.create([
      { proyecto: uno, titulo: "A", url: "https://a.example.com", orden: 0 },
      { proyecto: uno, titulo: "B", url: "https://b.example.com", orden: 0 },
    ]);
    const [grupo] = await listarDemosAdmin();
    expect(grupo?.demos).toHaveLength(2);
    const b = grupo.demos[1].id;
    await moverDemo(b, "subir");
    expect(await titulosDe(uno)).toEqual(["B", "A"]);
  });

  it("editar sin cambiar de proyecto conserva el orden; cambiar de proyecto la manda al final del nuevo", async () => {
    const a = await crear({ titulo: "A" });
    await crear({ titulo: "B" });
    await crear({ titulo: "X", proyecto: dos });
    expect(await editarDemo(a, entrada({ titulo: "A2" }))).toEqual({ ok: true, id: a });
    expect(await titulosDe(uno)).toEqual(["A2", "B"]);
    expect(await editarDemo(a, entrada({ titulo: "A2", proyecto: dos }))).toEqual({ ok: true, id: a });
    expect(await titulosDe(uno)).toEqual(["B"]);
    expect(await titulosDe(dos)).toEqual(["X", "A2"]);
  });
});

describe("editar y borrar", () => {
  it("una demo http anterior al panel se puede editar sin cambiarle la URL; cambiarla a otra http no", async () => {
    const vieja = await Demo.create({ proyecto: uno, titulo: "Vieja", url: "http://vieja.example.com" });
    const id = String(vieja._id);
    expect(await editarDemo(id, entrada({ titulo: "Vieja 2", url: "http://vieja.example.com" }))).toEqual({ ok: true, id });
    expect((await obtenerDemoAdmin(id))?.titulo).toBe("Vieja 2");
    const r = await editarDemo(id, entrada({ url: "http://otra.example.com" }));
    expect(r).toMatchObject({ ok: false, error: "invalido" });
    expect(r.ok ? null : r.campos?.url).toBeTruthy();
    expect((await obtenerDemoAdmin(id))?.url).toBe("http://vieja.example.com");
  });

  it("una URL guardada por fuera del modelo (javascript:) no se conserva al editar: da error, no lanza", async () => {
    const { insertedId } = await Demo.collection.insertOne({ proyecto: new Types.ObjectId(uno), titulo: "Mala", url: "javascript:alert(1)" });
    const r = await editarDemo(String(insertedId), entrada({ url: "javascript:alert(1)" }));
    expect(r).toMatchObject({ ok: false, error: "invalido" });
    expect(r.ok ? null : r.campos?.url).toBeTruthy();
  });

  it("los ids en mayúsculas valen igual: mover funciona y el mismo proyecto no cuenta como cambio", async () => {
    await crear({ titulo: "A" });
    const b = await crear({ titulo: "B" });
    await crear({ titulo: "C" });
    expect(await moverDemo(b.toUpperCase(), "subir")).toEqual({ ok: true, id: b.toUpperCase() });
    expect(await titulosDe(uno)).toEqual(["B", "A", "C"]);
    expect(await editarDemo(b, entrada({ titulo: "B2", proyecto: uno.toUpperCase() }))).toMatchObject({ ok: true });
    expect(await titulosDe(uno)).toEqual(["B2", "A", "C"]);
    expect((await obtenerDemoAdmin(b))?.proyecto).toBe(uno);
  });

  it("editar guarda todos los campos", async () => {
    const id = await crear();
    const r = await editarDemo(
      id,
      entrada({ titulo: "Nueva", url: "https://nueva.example.com", descripcion: "Algo", activa: false }),
    );
    expect(r).toEqual({ ok: true, id });
    expect(await obtenerDemoAdmin(id)).toMatchObject({
      id,
      proyecto: uno,
      titulo: "Nueva",
      url: "https://nueva.example.com",
      descripcion: "Algo",
      activa: false,
    });
  });

  it("la versión cambia con cada guardado (editar, activar, mover): es la key del formulario", async () => {
    const id = await crear();
    await crear({ titulo: "Otra" });
    const versiones = [(await obtenerDemoAdmin(id))?.version];
    for (const escribir of [
      () => editarDemo(id, entrada({ titulo: "Editada" })),
      () => activarDemo(id, false),
      () => moverDemo(id, "bajar"),
    ]) {
      await new Promise((r) => setTimeout(r, 5));
      await escribir();
      versiones.push((await obtenerDemoAdmin(id))?.version);
    }
    expect(versiones.every((v) => typeof v === "string" && v !== "")).toBe(true);
    expect(new Set(versiones).size).toBe(versiones.length);
  });

  it("borrar la saca de la base y del detalle", async () => {
    const id = await crear();
    expect(await borrarDemo(id)).toEqual({ ok: true, id });
    expect(await Demo.countDocuments()).toBe(0);
    expect((await detalleProyecto("uno"))?.demos).toEqual([]);
  });
});
