import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// `use cache` no corre en Vitest: `listarProyectos` (lo que lee el sitio) se prueba sin caché.
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { Demo } from "@/models/Demo";
import { Proyecto } from "@/models/Proyecto";
import { listarProyectos } from "./contenido";
import { conectar, desconectar } from "./db";
import {
  actualizarProyecto,
  borrarProyecto,
  crearProyecto,
  listarProyectosAdmin,
  obtenerProyectoAdmin,
  publicarProyecto,
  reordenar,
} from "./proyectos-admin";

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test-proyectos-admin";
  await desconectar();
}, 120_000);

beforeEach(async () => {
  await conectar();
  await Promise.all([Proyecto.deleteMany({}), Demo.deleteMany({})]);
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

function entrada(slug: string, extra: Record<string, unknown> = {}) {
  return {
    slug,
    nombre: `Proyecto ${slug}`,
    inicial: "P",
    categoria: "Web",
    descripcion: "Una descripción corta.",
    stack: ["Next.js", "MongoDB"],
    repoUrl: `https://github.com/lautioliver/${slug}`,
    acento: "primario",
    caso: { problema: "El problema", solucion: "La solución", funcionalidades: ["Una"], stack: ["TS"] },
    publicado: true,
    ...extra,
  };
}

async function crear(slug: string, extra: Record<string, unknown> = {}): Promise<string> {
  const r = await crearProyecto(entrada(slug, extra));
  if (!r.ok || !r.id) throw new Error(`no se creó ${slug}: ${JSON.stringify(r)}`);
  return r.id;
}

const ID_INEXISTENTE = "6528f0c2a1b2c3d4e5f60718";

describe("crearProyecto", () => {
  it("guarda un proyecto válido, al final del orden, y aparece en el sitio si está publicado", async () => {
    await crear("primero");
    const id = await crear("segundo", { imagen: "https://blob.example.com/contenido/a.png" });
    const doc = await Proyecto.findById(id).lean();
    expect(doc).toMatchObject({ slug: "segundo", publicado: true, imagen: "https://blob.example.com/contenido/a.png" });
    const lista = await listarProyectosAdmin();
    expect(lista.map((p) => p.slug)).toEqual(["primero", "segundo"]);
    expect(lista[1].orden).toBeGreaterThan(lista[0].orden);
    // Lo que lee el sitio (sin la caché de Next): aparece sin redeploy.
    expect((await listarProyectos()).map((p) => p.slug)).toEqual(["primero", "segundo"]);
  });

  it("un proyecto sin publicar no aparece en el sitio", async () => {
    await crear("visible");
    await crear("borrador", { publicado: false });
    expect((await listarProyectos()).map((p) => p.slug)).toEqual(["visible"]);
  });

  it("un slug duplicado da error en el campo slug y no guarda nada", async () => {
    await crear("repetido");
    const r = await crearProyecto(entrada("repetido", { nombre: "Otro" }));
    expect(r).toMatchObject({ ok: false, error: "invalida" });
    expect(!r.ok && r.campos?.slug).toBeTruthy();
    expect(await Proyecto.countDocuments()).toBe(1);
  });

  it("los datos inválidos devuelven el error por campo y no guardan nada", async () => {
    const r = await crearProyecto(
      entrada("Mal Slug", {
        descripcion: "x".repeat(301),
        stack: [],
        repoUrl: "http://github.com/x",
        imagen: "javascript:alert(1)",
        acento: "fucsia",
        caso: { problema: "x".repeat(1501), solucion: "ok", funcionalidades: [], stack: [] },
      }),
    );
    expect(r.ok).toBe(false);
    const campos = (!r.ok && r.campos) || {};
    expect(Object.keys(campos).sort()).toEqual(
      ["acento", "caso.problema", "descripcion", "imagen", "repoUrl", "slug", "stack"].sort(),
    );
    for (const mensaje of Object.values(campos)) expect(mensaje).toMatch(/\S/);
    expect(await Proyecto.countDocuments()).toBe(0);
  });

  it("respeta los largos máximos: descripción 300, cada campo del caso 1500 y de 1 a 10 tecnologías", async () => {
    const enElLimite = entrada("al-limite", {
      descripcion: "x".repeat(300),
      stack: Array.from({ length: 10 }, (_, i) => `T${i}`),
      caso: { problema: "p".repeat(1500), solucion: "s".repeat(1500), funcionalidades: ["f".repeat(1500)], stack: [] },
    });
    expect((await crearProyecto(enElLimite)).ok).toBe(true);
    const r = await crearProyecto(entrada("once", { stack: Array.from({ length: 11 }, (_, i) => `T${i}`) }));
    expect(!r.ok && r.campos?.stack).toBeTruthy();
    const r2 = await crearProyecto(
      entrada("func-larga", { caso: { problema: "p", solucion: "s", funcionalidades: ["f".repeat(1501)], stack: [] } }),
    );
    expect(!r2.ok && r2.campos?.["caso.funcionalidades"]).toBeTruthy();
  });

  // Revisión del PR #60: el modelo acepta strings vacíos, el esquema de lectura los descarta y el proyecto
  // desaparecería del sitio. Se valida con el esquema público antes de guardar.
  it("rechaza strings vacíos en el stack y en el caso, que harían desaparecer el proyecto del sitio", async () => {
    const r = await crearProyecto(entrada("vacio-stack", { stack: ["React", "  "] }));
    expect(!r.ok && r.campos?.stack).toBeTruthy();
    const r2 = await crearProyecto(
      entrada("vacio-caso", { caso: { problema: "p", solucion: "s", funcionalidades: [""], stack: [""] } }),
    );
    expect(!r2.ok && Object.keys(r2.campos ?? {}).sort()).toEqual(["caso.funcionalidades", "caso.stack"]);
    const r3 = await crearProyecto(entrada("vacio-problema", { caso: { problema: " ", solucion: "s", funcionalidades: [], stack: [] } }));
    expect(!r3.ok && r3.campos?.["caso.problema"]).toBeTruthy();
    expect(await Proyecto.countDocuments()).toBe(0);
  });

  it("ignora campos que no son del formulario (orden, _id)", async () => {
    const id = await crear("con-extras", { orden: -50, _id: ID_INEXISTENTE });
    expect(id).not.toBe(ID_INEXISTENTE);
    expect((await Proyecto.findById(id).lean())?.orden).not.toBe(-50);
  });
});

describe("actualizarProyecto", () => {
  it("cambia los campos y quita la imagen si no viene", async () => {
    const id = await crear("original", { imagen: "https://blob.example.com/contenido/a.png" });
    const r = await actualizarProyecto(id, entrada("renombrado", { nombre: "Nuevo nombre", publicado: false }));
    expect(r).toMatchObject({ ok: true, id });
    const doc = await Proyecto.findById(id).lean();
    expect(doc).toMatchObject({ slug: "renombrado", nombre: "Nuevo nombre", publicado: false });
    expect(doc?.imagen).toBeUndefined();
  });

  it("no deja usar el slug de otro proyecto", async () => {
    await crear("ocupado");
    const id = await crear("libre");
    const r = await actualizarProyecto(id, entrada("ocupado"));
    expect(!r.ok && r.campos?.slug).toBeTruthy();
    expect((await Proyecto.findById(id).lean())?.slug).toBe("libre");
  });

  it("con datos inválidos devuelve el error por campo y no toca el documento", async () => {
    const id = await crear("intacto");
    const r = await actualizarProyecto(id, entrada("intacto", { stack: [""] }));
    expect(!r.ok && r.campos?.stack).toBeTruthy();
    expect((await Proyecto.findById(id).lean())?.stack).toEqual(["Next.js", "MongoDB"]);
  });

  it("un id inválido o inexistente da no-encontrado", async () => {
    expect(await actualizarProyecto(ID_INEXISTENTE, entrada("x"))).toMatchObject({ ok: false, error: "no-encontrado" });
    expect(await actualizarProyecto("no-es-un-id", entrada("x"))).toMatchObject({ ok: false, error: "no-encontrado" });
  });
});

describe("obtenerProyectoAdmin", () => {
  it("devuelve los datos para el formulario, o null", async () => {
    const id = await crear("para-editar", { publicado: false });
    expect(await obtenerProyectoAdmin(id)).toMatchObject({ id, slug: "para-editar", publicado: false, stack: ["Next.js", "MongoDB"] });
    expect(await obtenerProyectoAdmin(ID_INEXISTENTE)).toBeNull();
    expect(await obtenerProyectoAdmin("x")).toBeNull();
  });
});

describe("borrarProyecto", () => {
  it("borra el proyecto y sus demos, y deja las demos de los otros", async () => {
    const id = await crear("a-borrar");
    const otro = await crear("queda");
    await Demo.create([
      { proyecto: id, titulo: "Demo 1", url: "https://demo.example.com" },
      { proyecto: id, titulo: "Demo 2", url: "https://demo2.example.com", activa: false },
      { proyecto: otro, titulo: "Demo de otro", url: "https://otro.example.com" },
    ]);
    expect((await listarProyectosAdmin()).find((p) => p.id === id)?.demos).toBe(2);
    expect(await borrarProyecto(id)).toMatchObject({ ok: true });
    expect(await Proyecto.exists({ _id: id })).toBeNull();
    expect(await Demo.countDocuments({ proyecto: id })).toBe(0);
    expect(await Demo.countDocuments({ proyecto: otro })).toBe(1);
  });

  it("si borrar las demos falla, el proyecto queda borrado y devuelve `parcial` con un mensaje claro", async () => {
    const id = await crear("demos-trabadas");
    await Demo.create({ proyecto: id, titulo: "Demo", url: "https://demo.example.com" });
    const espia = vi.spyOn(Demo, "deleteMany").mockRejectedValueOnce(new Error("se cortó la conexión"));
    const aviso = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await borrarProyecto(id);
    expect(r).toMatchObject({ ok: false, error: "parcial" });
    expect(!r.ok && r.mensaje).toMatch(/demos/);
    expect(await Proyecto.exists({ _id: id })).toBeNull();
    // Del error se loguea solo el nombre.
    expect(JSON.stringify(aviso.mock.calls)).not.toContain("se cortó la conexión");
    espia.mockRestore();
    aviso.mockRestore();
  });

  it("un id inválido o inexistente da no-encontrado", async () => {
    expect(await borrarProyecto(ID_INEXISTENTE)).toMatchObject({ ok: false, error: "no-encontrado" });
    expect(await borrarProyecto("{}")).toMatchObject({ ok: false, error: "no-encontrado" });
  });
});

describe("publicarProyecto", () => {
  it("publica y despublica", async () => {
    const id = await crear("toggle", { publicado: false });
    expect(await publicarProyecto(id, true)).toMatchObject({ ok: true });
    expect((await listarProyectos()).map((p) => p.slug)).toEqual(["toggle"]);
    expect(await publicarProyecto(id, false)).toMatchObject({ ok: true });
    expect((await Proyecto.findById(id).lean())?.publicado).toBe(false);
    expect(await publicarProyecto(ID_INEXISTENTE, true)).toMatchObject({ ok: false, error: "no-encontrado" });
  });
});

describe("reordenar", () => {
  it("guarda el orden recibido y el sitio lo respeta", async () => {
    const a = await crear("a");
    const b = await crear("b");
    const c = await crear("c");
    expect(await reordenar([c, a, b])).toMatchObject({ ok: true });
    expect((await listarProyectosAdmin()).map((p) => p.slug)).toEqual(["c", "a", "b"]);
    expect((await listarProyectos()).map((p) => p.slug)).toEqual(["c", "a", "b"]);
  });

  it("si la lista no coincide con los proyectos (falta, sobra o se repite uno), no cambia nada", async () => {
    const a = await crear("a");
    const b = await crear("b");
    for (const ids of [[b], [b, a, ID_INEXISTENTE], [b, b], [b, "no-es-id"], "a,b", [], null]) {
      const r = await reordenar(ids);
      expect(r.ok).toBe(false);
    }
    expect((await listarProyectosAdmin()).map((p) => p.slug)).toEqual(["a", "b"]);
  });
});
