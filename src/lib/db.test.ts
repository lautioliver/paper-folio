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

  it("no abre otro cliente durante un corte: el driver reintenta solo", async () => {
    const propio = await MongoMemoryServer.create();
    process.env.MONGODB_URI = propio.getUri();
    try {
      const m = await conectar();
      const cliente = m.connection.getClient();
      const spy = vi.spyOn(mongoose, "connect");
      await propio.stop({ doCleanup: false });
      for (let i = 0; i < 100 && m.connection.readyState !== 0; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(m.connection.readyState).toBe(0);
      await conectar().catch(() => {});
      expect(spy).not.toHaveBeenCalled();
      expect(m.connection.getClient()).toBe(cliente);
    } finally {
      process.env.MONGODB_URI = servidor.getUri();
      await desconectar();
      await propio.stop();
    }
  }, 30_000);

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
