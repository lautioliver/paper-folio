import { createHash } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { desconectar } from "./db";
import { crearConsulta } from "./consultas";
import { avisarConsultaNueva } from "./email";
import { Consulta } from "@/models/Consulta";

// Ningún test llama a Resend: sin `avisar`, crearConsulta usa avisarConsultaNueva, que acá es un mock.
vi.mock("./email", () => ({ avisarConsultaNueva: vi.fn(async () => {}) }));

const SAL = "sal-de-prueba-0123456789";
const valida = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  type: "cotizacion",
  message: "Quiero cotizar un sitio para mi estudio.",
};

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test";
  process.env.IP_HASH_SAL = SAL;
  await desconectar();
}, 120_000);

beforeEach(async () => {
  const { conectar } = await import("./db");
  await conectar();
  await Consulta.deleteMany({});
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

describe("crearConsulta", () => {
  it("guarda una consulta válida con estado nueva, emailEnviado false si no se pudo avisar y el hash de la IP", async () => {
    const r = await crearConsulta(valida, { ip: "203.0.113.7", avisar: async () => Promise.reject(new Error("x")) });
    expect(r.tipo).toBe("creada");
    const docs = await Consulta.find().lean();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      nombre: "Ada Lovelace",
      email: "ada@example.com",
      tipo: "cotizacion",
      mensaje: "Quiero cotizar un sitio para mi estudio.",
      estado: "nueva",
      emailEnviado: false,
    });
    expect(docs[0].creadaEn).toBeInstanceOf(Date);
    expect(docs[0].ipHash).toBe(
      createHash("sha256")
        .update(SAL + "203.0.113.7")
        .digest("hex"),
    );
  });

  it("no guarda la IP en claro", async () => {
    await crearConsulta(valida, { ip: "203.0.113.7" });
    const crudo = JSON.stringify(await Consulta.find().lean());
    expect(crudo).not.toContain("203.0.113.7");
  });

  it("devuelve los errores por campo y no guarda si es inválida", async () => {
    const r = await crearConsulta({ ...valida, email: "no-es-email", message: "corto" }, { ip: "1.1.1.1" });
    expect(r.tipo).toBe("invalida");
    if (r.tipo === "invalida") {
      expect(Object.keys(r.errores).sort()).toEqual(["email", "message"]);
    }
    expect(await Consulta.countDocuments()).toBe(0);
  });

  it("devuelve descartada y no guarda ni avisa si sitio_web trae algo", async () => {
    const avisar = vi.fn();
    const r = await crearConsulta({ ...valida, sitio_web: "http://spam.example" }, { ip: "1.1.1.1", avisar });
    expect(r.tipo).toBe("descartada");
    expect(await Consulta.countDocuments()).toBe(0);
    expect(avisar).not.toHaveBeenCalled();
  });

  it("lee sitio_web antes de validar: un bot con campos inválidos también recibe descartada", async () => {
    const r = await crearConsulta({ name: "", sitio_web: "x" }, { ip: "1.1.1.1" });
    expect(r.tipo).toBe("descartada");
  });

  it("sitio_web vacío o ausente no descarta", async () => {
    expect((await crearConsulta({ ...valida, sitio_web: "" }, { ip: "1.1.1.1" })).tipo).toBe("creada");
    expect((await crearConsulta({ ...valida, sitio_web: "   " }, { ip: "1.1.1.1" })).tipo).toBe("creada");
  });

  it("las descartadas no cuentan para el límite", async () => {
    for (let i = 0; i < 6; i++) await crearConsulta({ ...valida, sitio_web: "x" }, { ip: "9.9.9.9" });
    expect((await crearConsulta(valida, { ip: "9.9.9.9" })).tipo).toBe("creada");
  });

  it("la sexta consulta de la misma IP en una hora da limite; otra IP puede", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await crearConsulta(valida, { ip: "10.0.0.1" })).tipo).toBe("creada");
    }
    expect((await crearConsulta(valida, { ip: "10.0.0.1" })).tipo).toBe("limite");
    expect(await Consulta.countDocuments()).toBe(5);
    expect((await crearConsulta(valida, { ip: "10.0.0.2" })).tipo).toBe("creada");
  });

  it("las consultas de hace más de una hora no cuentan", async () => {
    const hace = new Date(Date.now() - 61 * 60 * 1000);
    for (let i = 0; i < 5; i++) await crearConsulta(valida, { ip: "10.0.0.3", ahora: () => hace });
    expect(await Consulta.countDocuments()).toBe(5);
    expect((await crearConsulta(valida, { ip: "10.0.0.3" })).tipo).toBe("creada");
  });

  it("una inválida no cuenta para el límite", async () => {
    for (let i = 0; i < 6; i++) await crearConsulta({ ...valida, message: "x" }, { ip: "10.0.0.4" });
    expect((await crearConsulta(valida, { ip: "10.0.0.4" })).tipo).toBe("creada");
  });

  it("llama a avisar con la consulta guardada, y no si da limite", async () => {
    const avisar = vi.fn();
    const r = await crearConsulta(valida, { ip: "10.0.0.5", avisar });
    expect(avisar).toHaveBeenCalledTimes(1);
    expect(avisar).toHaveBeenCalledWith(r.tipo === "creada" ? r.consulta : undefined);
    for (let i = 0; i < 4; i++) await crearConsulta(valida, { ip: "10.0.0.5" });
    avisar.mockClear();
    expect((await crearConsulta(valida, { ip: "10.0.0.5", avisar })).tipo).toBe("limite");
    expect(avisar).not.toHaveBeenCalled();
  });

  it("con avisar que sale bien, marca emailEnviado true", async () => {
    const avisar = vi.fn(async () => {});
    const r = await crearConsulta(valida, { ip: "10.1.0.1", avisar });
    expect(r.tipo).toBe("creada");
    expect((await Consulta.findOne().lean())?.emailEnviado).toBe(true);
  });

  it("si avisar falla, la consulta queda con emailEnviado false, devuelve creada y loguea solo el nombre del error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const avisar = vi.fn(async () => {
      throw Object.assign(new Error("fallo con ada@example.com y re_clave_secreta"), { name: "ErrorDeRed" });
    });
    try {
      const r = await crearConsulta(valida, { ip: "10.1.0.2", avisar });
      expect(r.tipo).toBe("creada");
      expect(await Consulta.countDocuments()).toBe(1);
      expect((await Consulta.findOne().lean())?.emailEnviado).toBe(false);
      const logueado = JSON.stringify(log.mock.calls);
      expect(logueado).toContain("ErrorDeRed");
      expect(logueado).not.toContain("ada@example.com");
      expect(logueado).not.toContain("re_clave_secreta");
    } finally {
      log.mockRestore();
    }
  });

  it("sin avisar, usa avisarConsultaNueva y marca emailEnviado true", async () => {
    vi.mocked(avisarConsultaNueva).mockClear();
    const r = await crearConsulta(valida, { ip: "10.1.0.3" });
    expect(avisarConsultaNueva).toHaveBeenCalledTimes(1);
    expect(avisarConsultaNueva).toHaveBeenCalledWith(r.tipo === "creada" ? r.consulta : undefined);
    expect((await Consulta.findOne().lean())?.emailEnviado).toBe(true);
  });

  it("tiene el índice { ipHash: 1, creadaEn: -1 }", async () => {
    await crearConsulta(valida, { ip: "10.0.0.6" });
    const indices = await Consulta.collection.indexes();
    expect(indices.some((i) => JSON.stringify(i.key) === JSON.stringify({ ipHash: 1, creadaEn: -1 }))).toBe(true);
  });

  it("falla con un error claro si la IP viene vacía o en blanco, sin guardar", async () => {
    for (const ip of ["", "   "]) {
      await expect(crearConsulta(valida, { ip })).rejects.toThrow(/IP/);
    }
    expect(await Consulta.countDocuments()).toBe(0);
  });

  it("recrea el índice si la conexión se cerró y se reconectó a otra base", async () => {
    await crearConsulta(valida, { ip: "10.0.0.7" });
    await desconectar();
    process.env.MONGODB_DB = "paperfolio-test-2";
    try {
      await crearConsulta(valida, { ip: "10.0.0.7" });
      const indices = await Consulta.collection.indexes();
      expect(indices.some((i) => JSON.stringify(i.key) === JSON.stringify({ ipHash: 1, creadaEn: -1 }))).toBe(true);
    } finally {
      await desconectar();
      process.env.MONGODB_DB = "paperfolio-test";
    }
  });

  it("trata igual la IP con espacios alrededor", async () => {
    for (let i = 0; i < 5; i++) await crearConsulta(valida, { ip: " 10.0.0.8 " });
    expect((await crearConsulta(valida, { ip: "10.0.0.8" })).tipo).toBe("limite");
  });
});
