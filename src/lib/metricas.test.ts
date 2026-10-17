import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conectar, desconectar } from "./db";
import {
  accesosPorDia,
  consultasPorDia,
  consultasPorTipo,
  rangoDe,
  registrosPorDia,
  totales,
  visitasPorDia,
} from "./metricas";
import { AccesoDiario } from "@/models/AccesoDiario";
import { Consulta } from "@/models/Consulta";
import { Usuario } from "@/models/Usuario";
import { VisitaDiaria } from "@/models/VisitaDiaria";
import { VisitanteDiario } from "@/models/VisitanteDiario";

// Una semana de Salta: del sábado 10 al viernes 16 de octubre de 2026.
const RANGO = { desde: "2026-10-10", hasta: "2026-10-16" };
const DIAS = ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"];

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test";
  await desconectar();
}, 120_000);

beforeEach(async () => {
  await conectar();
  await Promise.all([
    Consulta.deleteMany({}),
    Usuario.deleteMany({}),
    VisitaDiaria.deleteMany({}),
    VisitanteDiario.deleteMany({}),
    AccesoDiario.deleteMany({}),
  ]);
  const consulta = (tipo: string, creadaEn: string) => ({
    nombre: "Ana",
    email: "ana@example.com",
    tipo,
    mensaje: "Hola, quiero consultar algo.",
    estado: "nueva",
    ipHash: "x",
    creadaEn: new Date(creadaEn),
  });
  // Con el driver directo, para fijar `creadaEn` y `creadoEn` (los timestamps de Mongoose los pisarían).
  await Consulta.collection.insertMany([
    consulta("general", "2026-10-10T03:00:00Z"), // 00:00 del 10 en Salta: entra
    consulta("general", "2026-10-10T02:59:00Z"), // 23:59 del 9 en Salta: afuera
    consulta("cotizacion", "2026-10-12T15:00:00Z"),
    consulta("cotizacion", "2026-10-12T20:00:00Z"),
    consulta("asesoria", "2026-10-17T02:30:00Z"), // 23:30 del 16 en Salta: entra
    consulta("general", "2026-10-17T03:00:00Z"), // 00:00 del 17 en Salta: afuera
  ]);
  const usuario = (email: string, creadoEn: string) => ({
    email,
    rol: "usuario",
    ultimoAcceso: new Date(creadoEn),
    creadoEn: new Date(creadoEn),
  });
  await Usuario.collection.insertMany([
    usuario("a@example.com", "2026-10-11T12:00:00Z"),
    usuario("b@example.com", "2026-10-12T02:00:00Z"), // 23:00 del 11 en Salta
    usuario("c@example.com", "2026-10-09T12:00:00Z"), // afuera
  ]);
  await VisitaDiaria.collection.insertMany([
    { fecha: "2026-10-13", ruta: "/", total: 5 },
    { fecha: "2026-10-13", ruta: "/proyectos", total: 2 },
    { fecha: "2026-10-09", ruta: "/", total: 9 },
    { fecha: "2026-10-16", ruta: "otra", total: 1 },
  ]);
  await VisitanteDiario.collection.insertMany([
    { fecha: "2026-10-13", idHash: "a" },
    { fecha: "2026-10-13", idHash: "b" },
    { fecha: "2026-10-13", idHash: "c" },
    { fecha: "2026-10-16", idHash: "d" },
    { fecha: "2026-10-17", idHash: "e" },
  ]);
  await AccesoDiario.collection.insertMany([
    { fecha: "2026-10-14", tipo: "ingreso", total: 3 },
    { fecha: "2026-10-14", tipo: "detalle", total: 4 },
    { fecha: "2026-10-15", tipo: "detalle", total: 1 },
    { fecha: "2026-10-20", tipo: "ingreso", total: 8 },
  ]);
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

const serie = (valores: Record<string, number>) => DIAS.map((fecha) => ({ fecha, total: valores[fecha] ?? 0 }));

describe("rangoDe", () => {
  it("termina hoy (día de Salta) y tiene los días pedidos", () => {
    expect(rangoDe(7, new Date("2026-10-16T13:00:00Z"))).toEqual(RANGO);
    expect(rangoDe(30, new Date("2026-10-17T02:30:00Z"))).toEqual({ desde: "2026-09-17", hasta: "2026-10-16" });
    expect(rangoDe(90, new Date("2026-10-16T13:00:00Z"))).toEqual({ desde: "2026-07-19", hasta: "2026-10-16" });
  });
});

describe("consultasPorTipo", () => {
  it("cuenta las consultas del rango por tipo, con los tipos sin consultas en 0", async () => {
    expect(await consultasPorTipo(RANGO)).toEqual([
      { tipo: "general", total: 1 },
      { tipo: "cotizacion", total: 2 },
      { tipo: "asesoria", total: 1 },
    ]);
    expect(await consultasPorTipo({ desde: "2026-10-13", hasta: "2026-10-15" })).toEqual([
      { tipo: "general", total: 0 },
      { tipo: "cotizacion", total: 0 },
      { tipo: "asesoria", total: 0 },
    ]);
  });
});

describe("consultasPorDia", () => {
  it("cuenta por día de Salta y completa los días vacíos con 0", async () => {
    expect(await consultasPorDia(RANGO)).toEqual(serie({ "2026-10-10": 1, "2026-10-12": 2, "2026-10-16": 1 }));
  });

  it("filtra por tipo", async () => {
    expect(await consultasPorDia({ ...RANGO, tipo: "cotizacion" })).toEqual(serie({ "2026-10-12": 2 }));
    expect(await consultasPorDia({ ...RANGO, tipo: "asesoria" })).toEqual(serie({ "2026-10-16": 1 }));
  });
});

describe("registrosPorDia", () => {
  it("cuenta los usuarios nuevos por día de Salta, con los días vacíos en 0", async () => {
    expect(await registrosPorDia(RANGO)).toEqual(serie({ "2026-10-11": 2 }));
  });
});

describe("visitasPorDia", () => {
  it("suma las visitas de todas las rutas y cuenta los únicos por día", async () => {
    expect(await visitasPorDia(RANGO)).toEqual(
      DIAS.map((fecha) => ({
        fecha,
        visitas: { "2026-10-13": 7, "2026-10-16": 1 }[fecha] ?? 0,
        unicos: { "2026-10-13": 3, "2026-10-16": 1 }[fecha] ?? 0,
      })),
    );
  });
});

describe("accesosPorDia", () => {
  it("separa ingresos y vistas de detalle por día, con los días vacíos en 0", async () => {
    expect(await accesosPorDia(RANGO)).toEqual(
      DIAS.map((fecha) => ({
        fecha,
        ingreso: { "2026-10-14": 3 }[fecha] ?? 0,
        detalle: { "2026-10-14": 4, "2026-10-15": 1 }[fecha] ?? 0,
      })),
    );
  });
});

describe("totales", () => {
  it("suma cada serie del rango", async () => {
    const [porTipo, registros, visitas, accesos] = await Promise.all([
      consultasPorTipo(RANGO),
      registrosPorDia(RANGO),
      visitasPorDia(RANGO),
      accesosPorDia(RANGO),
    ]);
    expect(totales({ porTipo, registros, visitas, accesos })).toEqual({
      consultas: 4,
      registros: 2,
      visitas: 8,
      unicos: 4,
      accesos: 8,
    });
  });
});

describe("validación del rango y los filtros", () => {
  const invalidos: unknown[] = [
    { desde: { $ne: "" }, hasta: "2026-10-16" },
    { desde: "2026-10-10", hasta: { $gt: "" } },
    { desde: "2026-10-16", hasta: "2026-10-10" }, // al revés
    { desde: "2026-07-18", hasta: "2026-10-16" }, // 91 días
    { desde: "2026-1-1", hasta: "2026-10-16" },
    { desde: "2026-02-30", hasta: "2026-03-02" }, // no existe
    { desde: "2026-10-10" },
    { ...RANGO, $where: "sleep(1000)" },
    null,
    "2026-10-10",
  ];

  it("las agregaciones rechazan un rango inválido o con operadores", async () => {
    for (const rango of invalidos) {
      const r = rango as { desde: string; hasta: string };
      await expect(consultasPorTipo(r), JSON.stringify(rango)).rejects.toThrow();
      await expect(consultasPorDia(r), JSON.stringify(rango)).rejects.toThrow();
      await expect(registrosPorDia(r), JSON.stringify(rango)).rejects.toThrow();
      await expect(visitasPorDia(r), JSON.stringify(rango)).rejects.toThrow();
      await expect(accesosPorDia(r), JSON.stringify(rango)).rejects.toThrow();
    }
  });

  it("consultasPorDia rechaza un tipo con operadores o desconocido", async () => {
    for (const tipo of [{ $ne: "general" }, "otro", ["general"]]) {
      await expect(
        consultasPorDia({ ...RANGO, tipo } as unknown as Parameters<typeof consultasPorDia>[0]),
        JSON.stringify(tipo),
      ).rejects.toThrow();
    }
  });

  it("acepta un rango de 90 días", async () => {
    expect(await accesosPorDia({ desde: "2026-07-19", hasta: "2026-10-16" })).toHaveLength(90);
  });
});
