import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
    process.env.MONGODB_URI = "mongodb://127.0.0.1:1";
    const res = await GET();
    expect(res.status).toBe(503);
    const cuerpo = await res.json();
    expect(cuerpo.error.codigo).toEqual(expect.any(String));
    expect(cuerpo.error.mensaje).toEqual(expect.any(String));
    expect(JSON.stringify(cuerpo)).not.toContain("127.0.0.1");
  }, 15_000); // conectar() espera hasta 5 s a que el servidor responda

  it("distingue una configuración inválida del corte de la base y no filtra valores", async () => {
    await desconectar();
    const uri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = "postgres://usuario:clave-secreta@host/db";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await GET();
      expect(res.status).toBe(503);
      expect((await res.json()).error.codigo).toBe("CONFIGURACION_INVALIDA");
      const logueado = JSON.stringify(log.mock.calls);
      expect(logueado).toContain("MONGODB_URI");
      expect(logueado).not.toContain("clave-secreta");
    } finally {
      log.mockRestore();
      process.env.MONGODB_URI = uri;
    }
  });
});
