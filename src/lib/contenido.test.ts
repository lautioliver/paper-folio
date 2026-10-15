import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// `use cache` no corre en Vitest (es una directiva de Next): se espían cacheLife y cacheTag.
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { cacheLife, cacheTag } from "next/cache";
import { projects, services } from "@/content/profile";
import { Demo } from "@/models/Demo";
import { Proyecto } from "@/models/Proyecto";
import { Servicio } from "@/models/Servicio";
import { buscarProyecto, demosDe, listarProyectos, listarServicios, TAG_CONTENIDO } from "./contenido";
import { demoDesdePerfil, proyectoDesdePerfil, servicioDesdePerfil } from "./contenido-esquemas";
import { conectar, desconectar } from "./db";
import { sembrarContenido } from "./seed-contenido";

const respaldoProyectos = () => projects.map(proyectoDesdePerfil);
const respaldoServicios = () => services.map(servicioDesdePerfil);

let servidor: MongoMemoryServer;
let uri: string;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  uri = servidor.getUri();
  await desconectar();
}, 120_000);

beforeEach(async () => {
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = "paperfolio-test-contenido";
  await conectar();
  await Promise.all([Proyecto.deleteMany({}), Demo.deleteMany({}), Servicio.deleteMany({})]);
  vi.mocked(cacheLife).mockClear();
  vi.mocked(cacheTag).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

function proyectoDoc(slug: string, extra: Record<string, unknown> = {}) {
  return {
    slug,
    nombre: `Proyecto ${slug}`,
    inicial: "P",
    categoria: "Web",
    descripcion: "Descripción",
    stack: ["Next.js"],
    repoUrl: `https://github.com/lautioliver/${slug}`,
    acento: "primario",
    caso: { problema: "Problema", solucion: "Solución", funcionalidades: ["Una"], stack: ["TS"] },
    publicado: true,
    ...extra,
  };
}

describe("con la base vacía (sin seed)", () => {
  it("los proyectos, el detalle, las demos y los servicios salen del contenido estático", async () => {
    expect(await listarProyectos()).toEqual(respaldoProyectos());
    expect(await listarServicios()).toEqual(respaldoServicios());
    expect(await buscarProyecto("ucanode")).toEqual(proyectoDesdePerfil(projects[0]));
    expect(await demosDe("ucanode")).toEqual([demoDesdePerfil(projects[0])]);
    expect(await buscarProyecto("no-existe")).toBeNull();
    expect(await demosDe("no-existe")).toEqual([]);
  });

  it("el respaldo se cachea poco (minutes), así la base nueva aparece enseguida", async () => {
    await listarProyectos();
    expect(cacheLife).toHaveBeenCalledWith("minutes");
    expect(cacheTag).toHaveBeenCalledWith(TAG_CONTENIDO);
  });
});

describe("después del seed", () => {
  it("el sitio se ve igual que hoy: mismos proyectos, demos y servicios que el contenido estático", async () => {
    await sembrarContenido();
    expect(await listarProyectos()).toEqual(respaldoProyectos());
    expect(await listarServicios()).toEqual(respaldoServicios());
    for (const project of projects) {
      expect(await buscarProyecto(project.slug)).toEqual(proyectoDesdePerfil(project));
      expect(await demosDe(project.slug)).toEqual([demoDesdePerfil(project)]);
    }
  });

  it("lo leído de la base se cachea por horas, con el tag del contenido", async () => {
    await sembrarContenido();
    await listarProyectos();
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheLife).not.toHaveBeenCalledWith("minutes");
    expect(cacheTag).toHaveBeenCalledWith(TAG_CONTENIDO);
  });
});

describe("lo publicado y lo activo", () => {
  it("un proyecto con publicado: false no aparece en el listado ni en el detalle", async () => {
    await Proyecto.create([proyectoDoc("visible", { orden: 1 }), proyectoDoc("oculto", { publicado: false, orden: 0 })]);
    expect((await listarProyectos()).map((p) => p.slug)).toEqual(["visible"]);
    expect(await buscarProyecto("oculto")).toBeNull();
    expect(await demosDe("oculto")).toEqual([]);
    expect(await buscarProyecto("visible")).toMatchObject({ slug: "visible", nombre: "Proyecto visible" });
  });

  it("si todos los proyectos están despublicados, la lista queda vacía (no vuelve el respaldo)", async () => {
    await Proyecto.create(proyectoDoc("oculto", { publicado: false }));
    expect(await listarProyectos()).toEqual([]);
    expect(await buscarProyecto("ucanode")).toBeNull();
  });

  it("los proyectos salen por orden y sin campos internos (_id, fechas, orden, publicado)", async () => {
    await Proyecto.create([proyectoDoc("b", { orden: 2 }), proyectoDoc("a", { orden: 1 })]);
    const lista = await listarProyectos();
    expect(lista.map((p) => p.slug)).toEqual(["a", "b"]);
    const definidas = Object.entries(lista[0]).filter(([, valor]) => valor !== undefined).map(([clave]) => clave);
    expect(definidas.sort()).toEqual(
      ["acento", "caso", "categoria", "descripcion", "inicial", "nombre", "repoUrl", "slug", "stack", "tieneDemo"].sort(),
    );
  });

  it("las demos: solo las activas, en orden, y tieneDemo lo refleja", async () => {
    const [conDemo, sinDemo] = await Proyecto.create([proyectoDoc("con-demo"), proyectoDoc("sin-demo")]);
    await Demo.create([
      { proyecto: conDemo._id, titulo: "Segunda", url: "https://b.example.com", orden: 2 },
      { proyecto: conDemo._id, titulo: "Primera", url: "https://a.example.com", orden: 1, descripcion: "La principal" },
      { proyecto: conDemo._id, titulo: "Apagada", url: "https://c.example.com", activa: false, orden: 0 },
      { proyecto: sinDemo._id, titulo: "Apagada", url: "https://d.example.com", activa: false },
    ]);
    expect(await demosDe("con-demo")).toEqual([
      { titulo: "Primera", url: "https://a.example.com", descripcion: "La principal" },
      { titulo: "Segunda", url: "https://b.example.com", descripcion: "" },
    ]);
    expect(await demosDe("sin-demo")).toEqual([]);
    const lista = await listarProyectos();
    expect(lista.find((p) => p.slug === "con-demo")?.tieneDemo).toBe(true);
    expect(lista.find((p) => p.slug === "sin-demo")?.tieneDemo).toBe(false);
    expect((await buscarProyecto("sin-demo"))?.tieneDemo).toBe(false);
  });

  it("un servicio con publicado: false no aparece; el resto sale por orden", async () => {
    await Servicio.create([
      { titulo: "B", descripcion: "b", icono: "backend", orden: 2, publicado: true },
      { titulo: "A", descripcion: "a", icono: "frontend", orden: 1, publicado: true },
      { titulo: "Oculto", descripcion: "x", icono: "deploy", publicado: false },
    ]);
    expect(await listarServicios()).toEqual([
      { titulo: "A", descripcion: "a", icono: "frontend" },
      { titulo: "B", descripcion: "b", icono: "backend" },
    ]);
  });

  it("descarta lo que llegó a la base sin pasar por el modelo y no es seguro mostrar (javascript:, http en imagen)", async () => {
    const [proyecto] = await Proyecto.create([proyectoDoc("ok")]);
    await Proyecto.collection.insertOne({ ...proyectoDoc("malo"), repoUrl: "javascript:alert(1)" });
    await Demo.collection.insertOne({ proyecto: proyecto._id, titulo: "Mala", url: "javascript:alert(1)", activa: true, orden: 0 });
    await Servicio.collection.insertOne({ titulo: "Malo", descripcion: "x", imagen: "http://inseguro.example.com/a.png", publicado: true, orden: 0 });
    await Servicio.create({ titulo: "Bueno", descripcion: "y", icono: "deploy", publicado: true });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await listarProyectos()).map((p) => p.slug)).toEqual(["ok"]);
    expect(await buscarProyecto("malo")).toBeNull();
    expect(await demosDe("ok")).toEqual([]);
    expect((await listarServicios()).map((s) => s.titulo)).toEqual(["Bueno"]);
  });
});

describe("si la base cae", () => {
  it("sin MONGODB_URI: respaldo estático, y el log nombra el error sin datos de conexión", async () => {
    await desconectar();
    delete process.env.MONGODB_URI;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await listarProyectos()).toEqual(respaldoProyectos());
    expect(await listarServicios()).toEqual(respaldoServicios());
    expect(await buscarProyecto("campustatus")).toEqual(proyectoDesdePerfil(projects[2]));
    expect(await demosDe("campustatus")).toEqual([demoDesdePerfil(projects[2])]);
    expect(warn).toHaveBeenCalled();
    for (const [mensaje] of warn.mock.calls) expect(String(mensaje)).toMatch(/EnvInvalidoError/);
    expect(cacheLife).toHaveBeenCalledWith("minutes");
    expect(cacheLife).not.toHaveBeenCalledWith("hours");
  });

  it("con la base inalcanzable: la landing y /proyectos siguen con el contenido estático", async () => {
    await desconectar();
    process.env.MONGODB_URI = "mongodb://usuario:secreto@127.0.0.1:1/";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const [lista, servicios] = await Promise.all([listarProyectos(), listarServicios()]);
    expect(lista).toEqual(respaldoProyectos());
    expect(servicios).toEqual(respaldoServicios());
    expect(warn).toHaveBeenCalled();
    for (const [mensaje] of warn.mock.calls) {
      expect(String(mensaje)).not.toMatch(/secreto|127\.0\.0\.1|mongodb:/);
    }
    await desconectar();
  }, 30_000);
});
