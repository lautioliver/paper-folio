import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { projects, services } from "@/content/profile";
import { Demo } from "@/models/Demo";
import { Proyecto } from "@/models/Proyecto";
import { Servicio } from "@/models/Servicio";
import { conectar, desconectar } from "./db";
import { sembrarContenido } from "./seed-contenido";

const exec = promisify(execFile);

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test-seed";
  await desconectar();
}, 120_000);

beforeEach(async () => {
  await conectar();
  await Promise.all([Proyecto.deleteMany({}), Demo.deleteMany({}), Servicio.deleteMany({})]);
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

async function foto() {
  // Con las fechas: una segunda corrida no puede tocar ni `actualizadoEn`.
  const sin = { _id: 0, __v: 0 };
  return {
    proyectos: await Proyecto.find({}, sin).sort({ slug: 1 }).lean(),
    demos: await Demo.find({}, { ...sin, proyecto: 0 }).sort({ url: 1 }).lean(),
    servicios: await Servicio.find({}, sin).sort({ titulo: 1 }).lean(),
  };
}

describe("sembrarContenido", () => {
  it("carga proyectos, una demo por proyecto (su demoUrl) y servicios, publicados y en el orden de profile.ts", async () => {
    const r = await sembrarContenido();
    expect(r).toEqual({
      proyectos: { creados: projects.length, existentes: 0 },
      demos: { creadas: projects.length },
      servicios: { creados: services.length, existentes: 0 },
    });
    const lista = await Proyecto.find().sort({ orden: 1 }).lean();
    expect(lista.map((p) => p.slug)).toEqual(projects.map((p) => p.slug));
    expect(lista.every((p) => p.publicado)).toBe(true);
    const ucanode = lista[0];
    expect(ucanode).toMatchObject({ nombre: "UcaNode", inicial: "U", acento: "terciario", repoUrl: projects[0].repoUrl });
    const demos = await Demo.find({ proyecto: ucanode._id }).lean();
    expect(demos).toHaveLength(1);
    expect(demos[0]).toMatchObject({ url: projects[0].demoUrl, activa: true });
    const servicios = await Servicio.find().sort({ orden: 1 }).lean();
    expect(servicios.map((s) => s.titulo)).toEqual(services.map((s) => s.title));
    expect(servicios.every((s) => s.publicado)).toBe(true);
  });

  it("es idempotente: dos corridas dejan exactamente lo mismo", async () => {
    await sembrarContenido();
    const primera = await foto();
    const r = await sembrarContenido();
    expect(r).toEqual({
      proyectos: { creados: 0, existentes: projects.length },
      demos: { creadas: 0 },
      servicios: { creados: 0, existentes: services.length },
    });
    expect(await foto()).toEqual(primera);
  });

  it("no pisa lo editado en el panel: proyecto, demo y servicio quedan como los dejó el admin", async () => {
    await sembrarContenido();
    await Proyecto.updateOne({ slug: "ucanode" }, { $set: { descripcion: "Editada", publicado: false, orden: 9 } });
    const proyecto = await Proyecto.findOne({ slug: "ucanode" }).lean();
    expect(proyecto).not.toBeNull();
    await Demo.updateOne({ proyecto: proyecto!._id }, { $set: { titulo: "Otra", url: "https://otra.example.com", activa: false } });
    await Servicio.updateOne({ titulo: "Frontend" }, { $set: { descripcion: "Editada", publicado: false } });

    await sembrarContenido();

    expect(await Proyecto.findOne({ slug: "ucanode" }).lean()).toMatchObject({ descripcion: "Editada", publicado: false, orden: 9 });
    const demos = await Demo.find({ proyecto: proyecto!._id }).lean();
    expect(demos).toHaveLength(1);
    expect(demos[0]).toMatchObject({ titulo: "Otra", url: "https://otra.example.com", activa: false });
    expect(await Servicio.findOne({ titulo: "Frontend" }).lean()).toMatchObject({ descripcion: "Editada", publicado: false });
  });

  it("completa lo que falta: un proyecto o servicio borrado vuelve, el resto no se toca", async () => {
    await sembrarContenido();
    const proyecto = await Proyecto.findOne({ slug: "campustatus" }).lean();
    expect(proyecto).not.toBeNull();
    await Proyecto.deleteOne({ _id: proyecto!._id });
    await Demo.deleteMany({ proyecto: proyecto!._id });
    await Servicio.deleteOne({ titulo: "Deploy" });

    const r = await sembrarContenido();
    expect(r.proyectos).toEqual({ creados: 1, existentes: projects.length - 1 });
    expect(r.demos).toEqual({ creadas: 1 });
    expect(r.servicios).toEqual({ creados: 1, existentes: services.length - 1 });
    expect(await Demo.countDocuments()).toBe(projects.length);
  });
});

describe("npm run seed:contenido", () => {
  it("corre con Node (sin dependencias nuevas), carga la base y una segunda corrida no crea nada", async () => {
    const env = { ...process.env, MONGODB_URI: servidor.getUri(), MONGODB_DB: "paperfolio-test-seed-cli" };
    const primera = await exec("npm", ["run", "--silent", "seed:contenido"], { env });
    expect(primera.stdout).toMatch(/paperfolio-test-seed-cli/);
    expect(primera.stdout).toMatch(new RegExp(`Proyectos: ${projects.length} creados`));
    expect(primera.stdout).not.toMatch(/mongodb:\/\//);
    const segunda = await exec("npm", ["run", "--silent", "seed:contenido"], { env });
    expect(segunda.stdout).toMatch(/Proyectos: 0 creados/);
    expect(segunda.stdout).toMatch(/Demos: 0 creadas/);
  }, 60_000);

  it("sin MONGODB_URI falla con un mensaje claro y código distinto de cero", async () => {
    const env = { ...process.env, MONGODB_URI: "", MONGODB_DB: "" };
    await expect(exec("npm", ["run", "--silent", "seed:contenido"], { env })).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringMatching(/MONGODB_URI/),
    });
  }, 60_000);
});
