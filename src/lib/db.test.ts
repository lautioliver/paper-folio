import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { conectar, desconectar } from "./db";

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test";
}, 120_000);

beforeEach(async () => {
  await desconectar();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

describe("conectar", () => {
  it("conecta a la base indicada en MONGODB_DB", async () => {
    const m = await conectar();
    expect(m.connection.readyState).toBe(1);
    expect(m.connection.name).toBe("paperfolio-test");
  });

  it("reusa la conexión en llamadas repetidas y concurrentes", async () => {
    const spy = vi.spyOn(mongoose, "connect");
    const [a, b] = await Promise.all([conectar(), conectar()]);
    const c = await conectar();
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("reconecta si la conexión se cerró por fuera del cache", async () => {
    await conectar();
    await mongoose.disconnect();
    const m = await conectar();
    expect(m.connection.readyState).toBe(1);
  });

  it("no loguea la URI", async () => {
    const espias = (["log", "info", "warn", "error", "debug"] as const).map((n) =>
      vi.spyOn(console, n).mockImplementation(() => {}),
    );
    await conectar();
    const escrito = JSON.stringify(espias.flatMap((e) => e.mock.calls));
    expect(escrito).not.toContain(process.env.MONGODB_URI as string);
    espias.forEach((e) => e.mockRestore());
  });
});
