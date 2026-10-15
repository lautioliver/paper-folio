import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { desconectar } from "@/lib/db";
import { Consulta } from "@/models/Consulta";
import { POST } from "./route";

const SAL = "sal-de-prueba-0123456789";
const valida = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  type: "cotizacion",
  message: "Quiero cotizar un sitio para mi estudio.",
};

let servidor: MongoMemoryServer;
let uri: string;

function pedir(cuerpo: unknown, ip: string | null = "203.0.113.7", extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", ...extra };
  if (ip !== null) headers["x-forwarded-for"] = ip;
  return POST(
    new Request("http://localhost/api/consultas", {
      method: "POST",
      headers,
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );
}

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  uri = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test";
}, 120_000);

beforeEach(async () => {
  process.env.MONGODB_URI = uri;
  process.env.IP_HASH_SAL = SAL;
  await desconectar();
  const { conectar } = await import("@/lib/db");
  await conectar();
  await Consulta.deleteMany({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

describe("POST /api/consultas", () => {
  it("201 { ok: true } y guarda la consulta válida", async () => {
    const res = await pedir(valida);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(await Consulta.countDocuments()).toBe(1);
  });

  it("201 sin guardar nada si viene el campo trampa", async () => {
    const res = await pedir({ ...valida, sitio_web: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(await Consulta.countDocuments()).toBe(0);
  });

  it("400 CONSULTA_INVALIDA con los errores por campo", async () => {
    const res = await pedir({ ...valida, email: "no-es-email", name: "" });
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.error.codigo).toBe("CONSULTA_INVALIDA");
    expect(cuerpo.error.mensaje).toEqual(expect.any(String));
    expect(Object.keys(cuerpo.error.campos).sort()).toEqual(["email", "name"]);
    expect(await Consulta.countDocuments()).toBe(0);
  });

  it("400 CONSULTA_INVALIDA si el cuerpo no es JSON", async () => {
    const res = await pedir("{no es json");
    expect(res.status).toBe(400);
    expect((await res.json()).error.codigo).toBe("CONSULTA_INVALIDA");
  });

  it("429 DEMASIADAS_CONSULTAS a la sexta de la misma IP, pero no para otra IP", async () => {
    for (let i = 0; i < 5; i++) expect((await pedir(valida)).status).toBe(201);
    const sexta = await pedir(valida);
    expect(sexta.status).toBe(429);
    const cuerpo = await sexta.json();
    expect(cuerpo.error.codigo).toBe("DEMASIADAS_CONSULTAS");
    expect(cuerpo.error.mensaje).toEqual(expect.any(String));
    expect((await pedir(valida, "198.51.100.9")).status).toBe(201);
  });

  it("cuenta por el primer valor de x-forwarded-for y usa x-real-ip si falta", async () => {
    for (let i = 0; i < 5; i++) expect((await pedir(valida, `203.0.113.7, 10.0.0.${i}`)).status).toBe(201);
    expect((await pedir(valida, "203.0.113.7, 10.9.9.9")).status).toBe(429);
    for (let i = 0; i < 5; i++) {
      expect((await pedir(valida, null, { "x-real-ip": "198.51.100.4" })).status).toBe(201);
    }
    expect((await pedir(valida, null, { "x-real-ip": "198.51.100.4" })).status).toBe(429);
  });

  it("415 TIPO_NO_SOPORTADO si el Content-Type no es application/json, sin guardar", async () => {
    for (const tipo of ["text/plain", "application/x-www-form-urlencoded", ""]) {
      const res = await POST(
        new Request("http://localhost/api/consultas", {
          method: "POST",
          headers: { "content-type": tipo, "x-forwarded-for": "203.0.113.7" },
          body: JSON.stringify(valida),
        }),
      );
      expect(res.status).toBe(415);
      expect((await res.json()).error.codigo).toBe("TIPO_NO_SOPORTADO");
    }
    expect(await Consulta.countDocuments()).toBe(0);
  });

  it("acepta application/json con charset", async () => {
    const res = await pedir(valida, "203.0.113.7", { "content-type": "application/json; charset=utf-8" });
    expect(res.status).toBe(201);
  });

  it("400 IP_NO_DETECTADA sin IP, sin guardar y sin caer en un balde compartido", async () => {
    const res = await pedir(valida, null);
    expect(res.status).toBe(400);
    expect((await res.json()).error.codigo).toBe("IP_NO_DETECTADA");
    expect(await Consulta.countDocuments()).toBe(0);
  });

  it("503 CONFIGURACION_INVALIDA sin IP_HASH_SAL, nombrando la variable en el log y no en la respuesta", async () => {
    delete process.env.IP_HASH_SAL;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await pedir(valida);
    expect(res.status).toBe(503);
    expect((await res.json()).error.codigo).toBe("CONFIGURACION_INVALIDA");
    expect(JSON.stringify(log.mock.calls)).toContain("IP_HASH_SAL");
  });

  it("503 CONFIGURACION_INVALIDA con una URI inválida, sin filtrar el valor", async () => {
    await desconectar();
    process.env.MONGODB_URI = "postgres://usuario:clave-secreta@host/db";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await pedir(valida);
    expect(res.status).toBe(503);
    const cuerpo = await res.json();
    expect(cuerpo.error.codigo).toBe("CONFIGURACION_INVALIDA");
    const texto = JSON.stringify(cuerpo) + JSON.stringify(log.mock.calls);
    expect(texto).not.toContain("clave-secreta");
  });

  it("503 BASE_NO_DISPONIBLE si la base no responde, sin filtrar el detalle", async () => {
    await desconectar();
    process.env.MONGODB_URI = "mongodb://127.0.0.1:1";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await pedir(valida);
    expect(res.status).toBe(503);
    const cuerpo = await res.json();
    expect(cuerpo.error.codigo).toBe("BASE_NO_DISPONIBLE");
    expect(JSON.stringify(cuerpo) + JSON.stringify(log.mock.calls)).not.toContain("127.0.0.1");
  }, 15_000);
});
