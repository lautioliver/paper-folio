import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { desconectar } from "./db";
import { listarConsultas, parsearFiltros, POR_PAGINA } from "./bandeja";
import { Consulta } from "@/models/Consulta";

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test-bandeja";
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

const BASE = new Date("2026-01-01T00:00:00Z").getTime();

async function sembrar(
  n: number,
  extra: (i: number) => Record<string, unknown> = () => ({}),
) {
  await Consulta.insertMany(
    Array.from({ length: n }, (_, i) => ({
      nombre: `Persona ${i}`,
      email: `p${i}@example.com`,
      tipo: "general",
      mensaje: `Mensaje número ${i} de prueba`,
      ipHash: "secreto-hash-" + i,
      creadaEn: new Date(BASE + i * 60_000),
      ...extra(i),
    })),
  );
}

describe("listarConsultas", () => {
  it("con 45 consultas hay 3 páginas de 20, 20 y 5, de la más nueva a la más vieja", async () => {
    await sembrar(45);
    const p1 = await listarConsultas({ pagina: 1 });
    expect(POR_PAGINA).toBe(20);
    expect(p1.total).toBe(45);
    expect(p1.paginas).toBe(3);
    expect(p1.items).toHaveLength(20);
    expect(p1.items[0]?.nombre).toBe("Persona 44");
    const p3 = await listarConsultas({ pagina: 3 });
    expect(p3.items).toHaveLength(5);
    expect(p3.items[4]?.nombre).toBe("Persona 0");
  });

  it("no devuelve ipHash ni email en ningún item", async () => {
    await sembrar(2);
    const r = await listarConsultas({ pagina: 1 });
    const texto = JSON.stringify(r);
    expect(texto).not.toContain("ipHash");
    expect(texto).not.toContain("secreto-hash");
    expect(Object.keys(r.items[0] ?? {}).sort()).toEqual(
      ["creadaEn", "estado", "extracto", "id", "nombre", "tipo"].sort(),
    );
  });

  it("combina los filtros de tipo y estado", async () => {
    await sembrar(10, (i) => ({
      tipo: i % 2 === 0 ? "general" : "asesoria",
      estado: i < 6 ? "nueva" : "archivada",
    }));
    const r = await listarConsultas({
      tipo: "asesoria",
      estado: "nueva",
      pagina: 1,
    });
    expect(r.total).toBe(3);
    expect(
      r.items.every((c) => c.tipo === "asesoria" && c.estado === "nueva"),
    ).toBe(true);
  });

  it("una página fuera de rango devuelve la última válida", async () => {
    await sembrar(45);
    const r = await listarConsultas({ pagina: 99 });
    expect(r.pagina).toBe(3);
    expect(r.items).toHaveLength(5);
  });

  it("sin resultados: página 1, 0 páginas y lista vacía", async () => {
    const r = await listarConsultas({ pagina: 5 });
    expect(r).toMatchObject({ items: [], total: 0, paginas: 0, pagina: 1 });
  });

  it("recorta el mensaje a un extracto", async () => {
    await sembrar(1, () => ({ mensaje: "x".repeat(500) }));
    const r = await listarConsultas({ pagina: 1 });
    expect((r.items[0]?.extracto ?? "").length).toBeLessThanOrEqual(141);
    expect((r.items[0]?.extracto ?? "").endsWith("…")).toBe(true);
  });

  it("un filtro inválido o con operadores de Mongo se ignora, no se interpreta", async () => {
    await sembrar(3);
    const r = await listarConsultas(
      parsearFiltros({ tipo: { $ne: "x" }, estado: "inventado", pagina: "1" }),
    );
    expect(r.total).toBe(3);
  });
});

describe("hallazgos de la autorevisión", () => {
  it("un estado desconocido o ausente se muestra como nueva", async () => {
    await sembrar(2, (i) => (i === 0 ? { estado: "raro" } : {}));
    const r = await listarConsultas({ pagina: 1 });
    expect(r.items.map((c) => c.estado)).toEqual(["nueva", "nueva"]);
  });

  it("una página enorme devuelve la última, como cualquier página fuera de rango", async () => {
    await sembrar(45);
    const r = await listarConsultas(parsearFiltros({ pagina: "99999999999" }));
    expect(r.pagina).toBe(3);
  });

  it("el extracto no corta un emoji por la mitad", async () => {
    await sembrar(1, () => ({ mensaje: "a".repeat(139) + "😀".repeat(5) }));
    const r = await listarConsultas({ pagina: 1 });
    expect(r.items[0]?.extracto).not.toMatch(
      /[\ud800-\udbff](?![\udc00-\udfff])/,
    );
  });
});

describe("parsearFiltros: ceros a la izquierda", () => {
  it("?pagina=0000000002 es la página 2, no una página enorme", () => {
    expect(parsearFiltros({ pagina: "0000000002" }).pagina).toBe(2);
    expect(parsearFiltros({ pagina: "00000000000" }).pagina).toBe(1);
  });
});

describe("parsearFiltros", () => {
  it("valida tipo, estado y pagina; lo inválido se descarta", () => {
    expect(
      parsearFiltros({ tipo: "asesoria", estado: "en_curso", pagina: "2" }),
    ).toEqual({
      tipo: "asesoria",
      estado: "en_curso",
      pagina: 2,
    });
    expect(
      parsearFiltros({ tipo: "otro", estado: ["a", "b"], pagina: "abc" }),
    ).toEqual({ pagina: 1 });
    expect(parsearFiltros({ pagina: "-3" }).pagina).toBe(1);
    expect(parsearFiltros({ pagina: "0" }).pagina).toBe(1);
    expect(parsearFiltros({ pagina: "2.5" }).pagina).toBe(1);
    expect(parsearFiltros({}).pagina).toBe(1);
  });
});
