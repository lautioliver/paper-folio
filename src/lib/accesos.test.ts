import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { registrarAcceso } from "./accesos";
import { conectar, desconectar } from "./db";
import { AccesoDiario } from "@/models/AccesoDiario";
import { Usuario } from "@/models/Usuario";

// 2026-10-16 10:00 en Salta (UTC-3).
const HOY = new Date("2026-10-16T13:00:00Z");
// 2026-10-16 23:30 en Salta: en UTC ya es el 17.
const HOY_TARDE = new Date("2026-10-17T02:30:00Z");
const MANANA = new Date("2026-10-17T13:00:00Z");

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test";
  await desconectar();
}, 120_000);

beforeEach(async () => {
  await conectar();
  await AccesoDiario.deleteMany({});
  await Usuario.deleteMany({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

async function crearUsuario(email = "ana@example.com"): Promise<string> {
  const doc = await new Usuario({ email, ultimoAcceso: new Date() }).save();
  return String(doc._id);
}

describe("registrarAcceso", () => {
  it("dos ingresos del mismo usuario el mismo día dan total: 2 y accesos: 2", async () => {
    const id = await crearUsuario();
    expect(await registrarAcceso(id, "ingreso", HOY)).toBe(true);
    expect(await registrarAcceso(id, "ingreso", HOY_TARDE)).toBe(true);
    expect(await AccesoDiario.find({}, { _id: 0 }).lean()).toEqual([{ fecha: "2026-10-16", tipo: "ingreso", total: 2 }]);
    expect((await Usuario.findById(id).lean())?.accesos).toBe(2);
  });

  it("una vista de detalle suma en tipo: detalle, aparte de los ingresos", async () => {
    const id = await crearUsuario();
    await registrarAcceso(id, "ingreso", HOY);
    expect(await registrarAcceso(id, "detalle", HOY)).toBe(true);
    const docs = await AccesoDiario.find({}, { _id: 0 }).sort({ tipo: 1 }).lean();
    expect(docs).toEqual([
      { fecha: "2026-10-16", tipo: "detalle", total: 1 },
      { fecha: "2026-10-16", tipo: "ingreso", total: 1 },
    ]);
    expect((await Usuario.findById(id).lean())?.accesos).toBe(2);
  });

  it("cuenta aparte cada día y suma los accesos de todos los usuarios", async () => {
    const ana = await crearUsuario();
    const beto = await crearUsuario("beto@example.com");
    await registrarAcceso(ana, "ingreso", HOY);
    await registrarAcceso(beto, "ingreso", HOY);
    await registrarAcceso(ana, "ingreso", MANANA);
    const docs = await AccesoDiario.find({}, { _id: 0 }).sort({ fecha: 1 }).lean();
    expect(docs).toEqual([
      { fecha: "2026-10-16", tipo: "ingreso", total: 2 },
      { fecha: "2026-10-17", tipo: "ingreso", total: 1 },
    ]);
    expect((await Usuario.findById(ana).lean())?.accesos).toBe(2);
    expect((await Usuario.findById(beto).lean())?.accesos).toBe(1);
  });

  it("crea el índice único { fecha, tipo }", async () => {
    await registrarAcceso(await crearUsuario(), "ingreso", HOY);
    // Sin la colección, `indexes()` lanza: se toma como "sin índices".
    const indices = await AccesoDiario.collection.indexes().catch(() => []);
    expect(indices).toContainEqual(expect.objectContaining({ key: { fecha: 1, tipo: 1 }, unique: true }));
  });

  it("con un id que no es de Mongo o un tipo desconocido no cuenta nada ni lanza", async () => {
    const id = await crearUsuario();
    expect(await registrarAcceso("no-es-un-id", "ingreso", HOY)).toBe(false);
    expect(await registrarAcceso(id, "otro" as never, HOY)).toBe(false);
    expect(await AccesoDiario.countDocuments()).toBe(0);
    expect((await Usuario.findById(id).lean())?.accesos).toBe(0);
  });

  it("si la base falla, no lanza y loguea solo el nombre del error (sin la URI)", async () => {
    const id = await crearUsuario();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(AccesoDiario, "updateOne").mockRejectedValue(
      Object.assign(new Error("connect ECONNREFUSED mongodb://usuario:secreto@host"), { name: "MongoNetworkError" }),
    );
    await expect(registrarAcceso(id, "ingreso", HOY)).resolves.toBe(false);
    expect(error).toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).toContain("MongoNetworkError");
    expect(JSON.stringify(error.mock.calls)).not.toContain("secreto");
  });

  it("si la base no responde al conectar, tampoco lanza", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(mongoose, "connect").mockRejectedValue(new Error("sin base"));
    await desconectar();
    await expect(registrarAcceso(new mongoose.Types.ObjectId().toString(), "detalle", HOY)).resolves.toBe(false);
  });
});
