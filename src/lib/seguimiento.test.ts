import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { desconectar } from "./db";
import {
  agregarNota,
  cambiarEstado,
  obtenerConsulta,
  completarRespuesta,
  RESERVA_VENCE_MS,
  reservarRespuesta,
} from "./seguimiento";
import { LARGO_MAXIMO_NOTA } from "./estados-consulta";
import { Consulta } from "@/models/Consulta";
import { Usuario } from "@/models/Usuario";

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test-seguimiento";
  await desconectar();
}, 120_000);

let autor: string;

beforeEach(async () => {
  const { conectar } = await import("./db");
  await conectar();
  await Consulta.deleteMany({});
  await Usuario.deleteMany({});
  const u = await Usuario.create({
    email: "ope@example.com",
    nombre: "Olga Operadora",
    rol: "operador",
    ultimoAcceso: new Date(),
  });
  autor = String(u._id);
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

/** Inserta por el driver, sin pasar por Mongoose: así queda como un documento "viejo" de antes de #39. */
async function insertarCruda(extra: Record<string, unknown> = {}) {
  const r = await Consulta.collection.insertOne({
    nombre: "Ada Lovelace",
    email: "ada@example.com",
    tipo: "cotizacion",
    mensaje: "Quiero cotizar un sitio para mi estudio.",
    estado: "nueva",
    emailEnviado: true,
    ipHash: "hash-secreto-de-ip",
    creadaEn: new Date("2026-10-01T12:00:00Z"),
    ...extra,
  });
  return String(r.insertedId);
}

async function leer(id: string) {
  return Consulta.collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
}

describe("cambiarEstado", () => {
  it("nueva → en_curso cambia el estado y deja la entrada en el seguimiento con autor y fecha", async () => {
    const id = await insertarCruda();
    const antes = Date.now();
    const r = await cambiarEstado(id, "en_curso", autor);
    expect(r).toEqual({ ok: true });
    const doc = await leer(id);
    expect(doc?.estado).toBe("en_curso");
    expect(doc?.seguimiento).toHaveLength(1);
    const [e] = doc?.seguimiento ?? [];
    expect(e.tipo).toBe("estado");
    expect(e.texto).toBe("en_curso");
    expect(String(e.autor)).toBe(autor);
    expect(e.fecha).toBeInstanceOf(Date);
    expect(e.fecha.getTime()).toBeGreaterThanOrEqual(antes - 1000);
  });

  it("una transición inválida (respondida → nueva) devuelve error y no cambia nada", async () => {
    const id = await insertarCruda({ estado: "respondida", seguimiento: [] });
    const r = await cambiarEstado(id, "nueva", autor);
    expect(r).toMatchObject({ ok: false, error: "transicion-invalida" });
    const doc = await leer(id);
    expect(doc?.estado).toBe("respondida");
    expect(doc?.seguimiento).toEqual([]);
  });

  it("desde archivada se vuelve a en_curso, pero nunca a nueva", async () => {
    const id = await insertarCruda({ estado: "archivada" });
    expect(await cambiarEstado(id, "nueva", autor)).toMatchObject({
      ok: false,
      error: "transicion-invalida",
    });
    expect(await cambiarEstado(id, "en_curso", autor)).toEqual({ ok: true });
    expect((await leer(id))?.estado).toBe("en_curso");
  });

  it("recorre el ciclo entero y deja una entrada por cambio, en orden", async () => {
    const id = await insertarCruda();
    for (const e of ["en_curso", "respondida", "archivada", "en_curso"]) {
      expect(await cambiarEstado(id, e, autor)).toEqual({ ok: true });
    }
    const doc = await leer(id);
    expect(
      (doc?.seguimiento ?? []).map((s: { texto: string }) => s.texto),
    ).toEqual(["en_curso", "respondida", "archivada", "en_curso"]);
  });

  it("el mismo estado no es un cambio: devuelve error y no agrega nada", async () => {
    const id = await insertarCruda({ estado: "en_curso" });
    expect(await cambiarEstado(id, "en_curso", autor)).toMatchObject({
      ok: false,
      error: "transicion-invalida",
      mensaje: "La consulta ya está En curso.",
    });
    expect((await leer(id))?.seguimiento).toBeUndefined();
  });

  it("nueva → archivada (spam) y respondida → en_curso (el visitante vuelve a escribir) son válidas", async () => {
    const spam = await insertarCruda();
    expect(await cambiarEstado(spam, "archivada", autor)).toEqual({ ok: true });
    expect((await leer(spam))?.estado).toBe("archivada");
    const vuelve = await insertarCruda({ estado: "respondida" });
    expect(await cambiarEstado(vuelve, "en_curso", autor)).toEqual({ ok: true });
    expect((await leer(vuelve))?.estado).toBe("en_curso");
  });

  it("un estado inexistente o con operadores de Mongo es inválido y no cambia nada", async () => {
    const id = await insertarCruda();
    for (const malo of ["cerrada", { $ne: "x" }, ["en_curso"], null, 3]) {
      expect(await cambiarEstado(id, malo, autor)).toMatchObject({
        ok: false,
        error: "invalida",
      });
    }
    expect((await leer(id))?.estado).toBe("nueva");
  });

  it("una consulta inexistente o un id inválido devuelve no-encontrada", async () => {
    const otro = String(new mongoose.Types.ObjectId());
    expect(await cambiarEstado(otro, "en_curso", autor)).toMatchObject({
      ok: false,
      error: "no-encontrada",
    });
    expect(await cambiarEstado("no-es-un-id", "en_curso", autor)).toMatchObject(
      { ok: false, error: "no-encontrada" },
    );
  });
});

describe("estado guardado desconocido o ausente (hallazgo de la autorevisión)", () => {
  it("se lee como nueva y se puede pasar a en_curso, pero no saltear a respondida", async () => {
    for (const extra of [{ estado: "raro" }, { estado: undefined }]) {
      await Consulta.deleteMany({});
      const id = await insertarCruda(extra);
      if (extra.estado === undefined)
        await Consulta.collection.updateOne(
          { _id: new mongoose.Types.ObjectId(id) },
          { $unset: { estado: "" } },
        );
      expect((await obtenerConsulta(id))?.estado).toBe("nueva");
      expect(await cambiarEstado(id, "respondida", autor)).toMatchObject({
        ok: false,
        error: "transicion-invalida",
        mensaje: "No se puede pasar de Nueva a Respondida.",
      });
      expect(await cambiarEstado(id, "en_curso", autor)).toEqual({ ok: true });
      expect((await leer(id))?.estado).toBe("en_curso");
    }
  });
});

describe("agregarNota", () => {
  it("agrega una nota con su autor y su fecha, sin tocar el estado", async () => {
    const id = await insertarCruda();
    const r = await agregarNota(id, "  Llamar el lunes.  ", autor);
    expect(r).toEqual({ ok: true });
    const doc = await leer(id);
    expect(doc?.estado).toBe("nueva");
    expect(doc?.seguimiento).toHaveLength(1);
    const [e] = doc?.seguimiento ?? [];
    expect(e.tipo).toBe("nota");
    expect(e.texto).toBe("Llamar el lunes.");
    expect(String(e.autor)).toBe(autor);
    expect(e.fecha).toBeInstanceOf(Date);
  });

  it("acepta hasta 2000 caracteres y rechaza vacía, solo espacios, más larga o que no sea texto", async () => {
    const id = await insertarCruda();
    expect(LARGO_MAXIMO_NOTA).toBe(2000);
    for (const mala of ["", "   \n ", "x".repeat(2001), { $set: 1 }, 5, null]) {
      expect(await agregarNota(id, mala, autor)).toMatchObject({
        ok: false,
        error: "invalida",
      });
    }
    expect((await leer(id))?.seguimiento).toBeUndefined();
    expect(await agregarNota(id, "x".repeat(2000), autor)).toEqual({
      ok: true,
    });
    expect(await agregarNota(id, "y", autor)).toEqual({ ok: true });
    expect((await leer(id))?.seguimiento).toHaveLength(2);
  });

  it("cuenta los saltos de línea CRLF del formulario como uno solo y los guarda como LF", async () => {
    const id = await insertarCruda();
    // 1000 líneas: 1999 caracteres con LF (lo que limita el maxLength del textarea), 2998 con CRLF.
    const texto = Array.from({ length: 1000 }, () => "a").join("\r\n");
    expect(await agregarNota(id, texto, autor)).toEqual({ ok: true });
    const [e] = (await leer(id))?.seguimiento ?? [];
    expect(e.texto).not.toContain("\r");
    expect(e.texto).toHaveLength(1999);
  });

  it("una consulta inexistente o un id inválido devuelve no-encontrada", async () => {
    expect(
      await agregarNota(String(new mongoose.Types.ObjectId()), "hola", autor),
    ).toMatchObject({ ok: false, error: "no-encontrada" });
    expect(await agregarNota("xyz", "hola", autor)).toMatchObject({
      ok: false,
      error: "no-encontrada",
    });
  });
});

describe("obtenerConsulta", () => {
  it("un documento viejo (estado nueva, sin seguimiento) se lee con el historial vacío", async () => {
    const id = await insertarCruda();
    const d = await obtenerConsulta(id);
    expect(d).toMatchObject({
      id,
      nombre: "Ada Lovelace",
      email: "ada@example.com",
      tipo: "cotizacion",
      mensaje: "Quiero cotizar un sitio para mi estudio.",
      estado: "nueva",
      emailEnviado: true,
      seguimiento: [],
    });
    expect(d?.creadaEn).toEqual(new Date("2026-10-01T12:00:00Z"));
  });

  it("al abrirla no cambia el estado de una consulta nueva", async () => {
    const id = await insertarCruda();
    await obtenerConsulta(id);
    const doc = await leer(id);
    expect(doc?.estado).toBe("nueva");
    expect(doc?.seguimiento).toBeUndefined();
  });

  it("nunca devuelve el ipHash", async () => {
    const id = await insertarCruda();
    const texto = JSON.stringify(await obtenerConsulta(id));
    expect(texto).not.toContain("ipHash");
    expect(texto).not.toContain("hash-secreto-de-ip");
  });

  it("devuelve el seguimiento en orden, con el nombre del autor", async () => {
    const id = await insertarCruda();
    await cambiarEstado(id, "en_curso", autor);
    await agregarNota(id, "Pidió presupuesto", autor);
    const d = await obtenerConsulta(id);
    expect(d?.estado).toBe("en_curso");
    expect(d?.seguimiento.map((s) => [s.tipo, s.texto, s.autorNombre])).toEqual(
      [
        ["estado", "en_curso", "Olga Operadora"],
        ["nota", "Pidió presupuesto", "Olga Operadora"],
      ],
    );
    expect(d?.seguimiento[0]?.autor).toBe(autor);
  });

  it("si el autor ya no existe, la entrada se muestra igual", async () => {
    const id = await insertarCruda();
    await agregarNota(id, "nota huérfana", autor);
    await Usuario.deleteMany({});
    const d = await obtenerConsulta(id);
    expect(d?.seguimiento[0]?.texto).toBe("nota huérfana");
    expect(d?.seguimiento[0]?.autorNombre).toBe("Usuario eliminado");
  });

  it("un autor guardado que no es un id (editado a mano) no rompe el detalle", async () => {
    const id = await insertarCruda({
      seguimiento: [{ tipo: "nota", texto: "rara", autor: "no-es-un-id", fecha: new Date() }],
    });
    const d = await obtenerConsulta(id);
    expect(d?.seguimiento[0]).toMatchObject({ texto: "rara", autorNombre: "Usuario eliminado" });
  });

  it("devuelve emailEnviado de las respuestas, también cuando es false", async () => {
    const id = await insertarCruda({ estado: "en_curso" });
    const r = await reservarRespuesta(id, "no salió", autor);
    if (r.ok) await completarRespuesta(id, autor, r.fecha, false);
    const d = await obtenerConsulta(id);
    expect(d?.seguimiento[0]).toMatchObject({ tipo: "respuesta", emailEnviado: false });
  });

  it("un id inexistente o inválido devuelve null", async () => {
    expect(
      await obtenerConsulta(String(new mongoose.Types.ObjectId())),
    ).toBeNull();
    expect(await obtenerConsulta("no-es-un-id")).toBeNull();
    expect(await obtenerConsulta("")).toBeNull();
  });
});

describe("reservarRespuesta y completarRespuesta (#40)", () => {
  it("reservar agrega una respuesta pendiente (sin emailEnviado) y no cambia el estado", async () => {
    const id = await insertarCruda({ estado: "en_curso", seguimiento: [] });
    const r = await reservarRespuesta(id, "Hola", autor);
    expect(r.ok).toBe(true);
    const doc = await leer(id);
    expect(doc?.estado).toBe("en_curso");
    expect(doc?.seguimiento).toHaveLength(1);
    expect(doc?.seguimiento[0]).toMatchObject({ tipo: "respuesta", texto: "Hola" });
    expect(doc?.seguimiento[0]).not.toHaveProperty("emailEnviado");
  });

  it("una segunda reserva con otra pendiente no matchea: devuelve en-envio y no agrega nada", async () => {
    const id = await insertarCruda({ estado: "en_curso", seguimiento: [] });
    const [a, b] = await Promise.all([
      reservarRespuesta(id, "Primera", autor),
      reservarRespuesta(id, "Segunda", autor),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect([a, b].find((r) => !r.ok)).toMatchObject({ ok: false, error: "en-envio" });
    expect((await leer(id))?.seguimiento).toHaveLength(1);
  });

  it("una pendiente vencida (proceso caído a mitad del envío) no bloquea para siempre", async () => {
    const vieja = new Date(Date.now() - RESERVA_VENCE_MS - 1000);
    const id = await insertarCruda({
      estado: "en_curso",
      seguimiento: [{ tipo: "respuesta", texto: "colgada", autor: new mongoose.Types.ObjectId(autor), fecha: vieja }],
    });
    expect((await reservarRespuesta(id, "Hola", autor)).ok).toBe(true);
  });

  it("reservar fuera de en curso devuelve estado-invalido; una inexistente, no-encontrada", async () => {
    const id = await insertarCruda({ estado: "nueva", seguimiento: [] });
    expect(await reservarRespuesta(id, "Hola", autor)).toMatchObject({ ok: false, error: "estado-invalido" });
    expect((await leer(id))?.seguimiento).toEqual([]);
    expect(
      await reservarRespuesta(String(new mongoose.Types.ObjectId()), "Hola", autor),
    ).toMatchObject({ ok: false, error: "no-encontrada" });
  });

  it("completar con el email enviado, en un solo update, marca la respuesta, agrega el estado y pasa a respondida", async () => {
    const id = await insertarCruda({ estado: "en_curso", seguimiento: [] });
    const r = await reservarRespuesta(id, "Hola", autor);
    if (!r.ok) throw new Error("no reservó");
    expect(await completarRespuesta(id, autor, r.fecha, true)).toEqual({ resultado: "completada", estadoCambiado: true });
    const doc = await leer(id);
    expect(doc?.estado).toBe("respondida");
    expect(doc?.seguimiento.map((e: { tipo: string; texto: string }) => [e.tipo, e.texto])).toEqual([
      ["respuesta", "Hola"],
      ["estado", "respondida"],
    ]);
    expect(doc?.seguimiento[0].emailEnviado).toBe(true);
    expect(String(doc?.seguimiento[1].autor)).toBe(autor);
    expect(doc?.seguimiento[1].autor).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(doc?.seguimiento[1]).not.toHaveProperty("emailEnviado");
  });

  it("completar con el email enviado pero la consulta ya no en curso marca la respuesta sin cambiar el estado", async () => {
    const id = await insertarCruda({ estado: "en_curso", seguimiento: [] });
    const r = await reservarRespuesta(id, "Hola", autor);
    if (!r.ok) throw new Error("no reservó");
    await Consulta.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { estado: "archivada" } });
    expect(await completarRespuesta(id, autor, r.fecha, true)).toEqual({ resultado: "completada", estadoCambiado: false });
    const doc = await leer(id);
    expect(doc?.estado).toBe("archivada");
    expect(doc?.seguimiento).toHaveLength(1);
    expect(doc?.seguimiento[0]).toMatchObject({ tipo: "respuesta", emailEnviado: true });
  });

  it("completar con el email fallido marca emailEnviado false, no cambia el estado y libera la reserva", async () => {
    const id = await insertarCruda({ estado: "en_curso", seguimiento: [] });
    const r = await reservarRespuesta(id, "Hola", autor);
    if (!r.ok) throw new Error("no reservó");
    expect(await completarRespuesta(id, autor, r.fecha, false)).toEqual({ resultado: "completada", estadoCambiado: false });
    const doc = await leer(id);
    expect(doc?.estado).toBe("en_curso");
    expect(doc?.seguimiento[0]).toMatchObject({ tipo: "respuesta", emailEnviado: false });
    expect((await reservarRespuesta(id, "Otra", autor)).ok).toBe(true);
  });

  it("completar sobre una consulta borrada devuelve sin-consulta", async () => {
    const r = await completarRespuesta(String(new mongoose.Types.ObjectId()), autor, new Date(), true);
    expect(r).toEqual({ resultado: "sin-consulta", estadoCambiado: false });
  });

  it("completar sin la entrada reservada (ya completada o borrada) devuelve sin-entrada, no completada", async () => {
    const id = await insertarCruda({ estado: "archivada", seguimiento: [] });
    for (const enviado of [true, false]) {
      const r = await completarRespuesta(id, autor, new Date(), enviado);
      expect(r).toEqual({ resultado: "sin-entrada", estadoCambiado: false });
    }
  });
});

describe("modelo Consulta", () => {
  it("estado es un enum de los cuatro valores, nueva por defecto, y seguimiento arranca vacío", async () => {
    const c = new Consulta({
      nombre: "a",
      email: "a@example.com",
      tipo: "general",
      mensaje: "hola hola hola",
      ipHash: "h",
    });
    expect(c.estado).toBe("nueva");
    expect(c.seguimiento).toHaveLength(0);
    c.estado = "cerrada" as never;
    await expect(c.validate()).rejects.toThrow(/estado/);
  });
});
