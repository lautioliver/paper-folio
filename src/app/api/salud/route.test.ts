import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { desconectar } from "@/lib/db";
import { GET } from "./route";

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_DB = "paperfolio-test";
}, 120_000);

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

describe("GET /api/salud", () => {
  it("responde 200 { ok: true } si la base responde al ping", async () => {
    process.env.MONGODB_URI = servidor.getUri();
    await desconectar();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("responde 503 con el formato de error si la base no responde", async () => {
    await desconectar();
    process.env.MONGODB_URI = "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=500";
    const res = await GET();
    expect(res.status).toBe(503);
    const cuerpo = await res.json();
    expect(cuerpo.error.codigo).toEqual(expect.any(String));
    expect(cuerpo.error.mensaje).toEqual(expect.any(String));
    expect(JSON.stringify(cuerpo)).not.toContain("127.0.0.1");
  });
});
