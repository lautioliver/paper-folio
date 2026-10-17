import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import nodemailer, { type SendMailOptions } from "nodemailer-10";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { conectar, desconectar } from "./db";
import { responderConsulta, type TransporteEmail } from "./respuestas";
import { RESERVA_VENCE_MS } from "./seguimiento";
import { Consulta } from "@/models/Consulta";

// Credenciales falsas: el entorno de Vitest las vacía (vitest.config.ts) y ningún test usa Gmail real.
const GMAIL_USER = "paperfolio.pruebas@example.com";
const GMAIL_APP_PASSWORD = "abcdabcdabcdabcd";
const AUTOR = "6528f0c2a1b2c3d4e5f60001";

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test-respuestas";
  await desconectar();
}, 120_000);

beforeEach(async () => {
  await conectar();
  await Consulta.deleteMany({});
  vi.stubEnv("GMAIL_USER", GMAIL_USER);
  vi.stubEnv("GMAIL_APP_PASSWORD", GMAIL_APP_PASSWORD);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

async function insertar(extra: Record<string, unknown> = {}) {
  const r = await Consulta.collection.insertOne({
    nombre: "Ada Lovelace",
    email: "ada@example.com",
    tipo: "cotizacion",
    mensaje: "Quiero cotizar un sitio.\nPara mi estudio.",
    estado: "en_curso",
    emailEnviado: true,
    ipHash: "hash",
    creadaEn: new Date("2026-10-01T12:00:00Z"),
    seguimiento: [],
    ...extra,
  });
  return String(r.insertedId);
}

async function leer(id: string) {
  return Consulta.collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
}

function transporteOk() {
  const enviados: SendMailOptions[] = [];
  const t: TransporteEmail = {
    sendMail: vi.fn(async (m: SendMailOptions) => {
      enviados.push(m);
      return { messageId: "x" };
    }),
  };
  return { t, enviados };
}

describe("responderConsulta: envío correcto", () => {
  it("manda el email al destino de la consulta guardada y la pasa a respondida con la respuesta en el seguimiento", async () => {
    const id = await insertar();
    const { t, enviados } = transporteOk();
    const r = await responderConsulta(id, "Hola Ada,\r\nte paso el presupuesto.", AUTOR, t);
    expect(r).toEqual({ ok: true, estadoCambiado: true });
    expect(enviados).toHaveLength(1);
    const m = enviados[0];
    expect(m.to).toEqual({ name: "Ada Lovelace", address: "ada@example.com" });
    expect(m.from).toBe(GMAIL_USER);
    // El tipo va con su etiqueta en español, no con el identificador interno (hallazgo de la autorevisión).
    expect(m.subject).toBe("Re: tu consulta en Paperfolio (Cotización de proyecto)");
    expect(m.html).toBeUndefined();
    expect(m.cc).toBeUndefined();
    expect(m.bcc).toBeUndefined();
    const texto = String(m.text);
    expect(texto.startsWith("Hola Ada,\nte paso el presupuesto.")).toBe(true);
    // El mensaje original va citado debajo.
    expect(texto).toContain("> Quiero cotizar un sitio.\n> Para mi estudio.");

    const doc = await leer(id);
    expect(doc?.estado).toBe("respondida");
    expect(doc?.seguimiento).toHaveLength(2);
    const [respuesta, estado] = doc?.seguimiento ?? [];
    expect(respuesta).toMatchObject({
      tipo: "respuesta",
      texto: "Hola Ada,\nte paso el presupuesto.",
      emailEnviado: true,
    });
    expect(String(respuesta.autor)).toBe(AUTOR);
    expect(respuesta.fecha).toBeInstanceOf(Date);
    // El cambio de estado también queda en el historial, como cualquier otro.
    expect(estado).toMatchObject({ tipo: "estado", texto: "respondida" });
    expect(String(estado.autor)).toBe(AUTOR);
  });

  it("si otro operador le cambió el estado mientras se enviaba, registra la respuesta enviada sin pisar el estado", async () => {
    const id = await insertar();
    const t: TransporteEmail = {
      sendMail: vi.fn(async () => {
        await Consulta.collection.updateOne(
          { _id: new mongoose.Types.ObjectId(id) },
          { $set: { estado: "archivada" } },
        );
        return {};
      }),
    };
    const r = await responderConsulta(id, "Hola", AUTOR, t);
    expect(r).toEqual({ ok: true, estadoCambiado: false });
    const doc = await leer(id);
    expect(doc?.estado).toBe("archivada");
    expect(doc?.seguimiento).toHaveLength(1);
    expect(doc?.seguimiento[0]).toMatchObject({ tipo: "respuesta", emailEnviado: true });
  });
});

describe("responderConsulta: envío fallido", () => {
  it("si el transporte falla, no cambia el estado, deja la entrada con emailEnviado false y devuelve el error", async () => {
    const id = await insertar();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error(`Invalid login: ${GMAIL_APP_PASSWORD}`), { code: "EAUTH" });
    const t: TransporteEmail = { sendMail: vi.fn().mockRejectedValue(error) };
    const r = await responderConsulta(id, "Respuesta secreta", AUTOR, t);
    expect(r).toMatchObject({ ok: false, error: "envio-fallido" });
    if (!r.ok) expect(r.mensaje).toContain("EAUTH");
    const doc = await leer(id);
    expect(doc?.estado).toBe("en_curso");
    expect(doc?.seguimiento).toHaveLength(1);
    expect(doc?.seguimiento[0]).toMatchObject({
      tipo: "respuesta",
      texto: "Respuesta secreta",
      emailEnviado: false,
    });
    // Del error, solo el código: ni la contraseña, ni el texto, ni el destino.
    const logueado = log.mock.calls.flat().map(String).join(" ");
    expect(logueado).toContain("EAUTH");
    expect(logueado).not.toContain(GMAIL_APP_PASSWORD);
    expect(logueado).not.toContain("Respuesta secreta");
    expect(logueado).not.toContain("ada@example.com");
  });

  it("si el transporte se cuelga, corta por timeout, no cambia el estado, deja la entrada pendiente y avisa que puede llegar", async () => {
    const id = await insertar();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t: TransporteEmail = { sendMail: () => new Promise(() => {}) };
    const r = await responderConsulta(id, "Hola", AUTOR, t, { timeoutMs: 50 });
    expect(r).toMatchObject({ ok: false, error: "envio-fallido" });
    // nodemailer no se puede cancelar: el envío colgado puede terminar después (hallazgo de la autorevisión).
    if (!r.ok) expect(r.mensaje).toMatch(/puede haber llegado/);
    const doc = await leer(id);
    expect(doc?.estado).toBe("en_curso");
    // Pendiente (sin `emailEnviado`): la reserva sigue bloqueando otro envío hasta vencer (#66).
    expect(doc?.seguimiento[0]).toMatchObject({ tipo: "respuesta", texto: "Hola" });
    expect(doc?.seguimiento[0]).not.toHaveProperty("emailEnviado");
  });

  it("sin las credenciales de Gmail no intenta enviar ni ensucia el seguimiento", async () => {
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const id = await insertar();
    const { t, enviados } = transporteOk();
    const r = await responderConsulta(id, "Hola", AUTOR, t);
    expect(r).toMatchObject({ ok: false, error: "envio-fallido" });
    if (!r.ok) expect(r.mensaje).toContain("configuracion");
    expect(enviados).toHaveLength(0);
    // No se intentó nada: reintentar no sirve hasta arreglar el entorno, y cada clic no suma una entrada.
    const doc = await leer(id);
    expect(doc?.estado).toBe("en_curso");
    expect(doc?.seguimiento).toEqual([]);
  });

  it("si el email salió pero la consulta se borró mientras se enviaba, lo dice en vez de 'no existe'", async () => {
    const id = await insertar();
    const t: TransporteEmail = {
      sendMail: vi.fn(async () => {
        await Consulta.collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
        return {};
      }),
    };
    const r = await responderConsulta(id, "Hola", AUTOR, t);
    expect(r).toMatchObject({ ok: false, error: "no-encontrada" });
    if (!r.ok) expect(r.mensaje).toMatch(/se envió/);
  });
});

describe("responderConsulta: doble envío y registro (revisión del PR #62)", () => {
  it("dos respuestas a la vez (dos pestañas u operadores) mandan un solo email; la otra recibe un error claro", async () => {
    const id = await insertar();
    const enviados: SendMailOptions[] = [];
    const lento: TransporteEmail = {
      sendMail: async (m) => {
        enviados.push(m);
        await new Promise((r) => setTimeout(r, 100));
        return {};
      },
    };
    const [a, b] = await Promise.all([
      responderConsulta(id, "Primera", AUTOR, lento),
      responderConsulta(id, "Segunda", AUTOR, lento),
    ]);
    expect(enviados).toHaveLength(1);
    expect([a, b].filter((r) => r.ok)).toHaveLength(1);
    const otra = [a, b].find((r) => !r.ok);
    expect(otra).toMatchObject({ ok: false, error: "en-envio" });
    if (otra && !otra.ok) {
      expect(otra.mensaje).toMatch(/otra respuesta/);
      // La pendiente puede ser un envío que salió sin registrarse: no promete que "se está enviando".
      expect(otra.mensaje).toMatch(/Enviados/);
    }
    const doc = await leer(id);
    expect(doc?.estado).toBe("respondida");
    expect(doc?.seguimiento.filter((e: { tipo: string }) => e.tipo === "respuesta")).toHaveLength(1);
  });

  it("si el email salió pero falla el registro del resultado, lo dice y la respuesta queda en el seguimiento como sin confirmar", async () => {
    const id = await insertar();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t: TransporteEmail = {
      sendMail: vi.fn(async () => {
        // El próximo update (el que completa la respuesta) falla, como en un failover de Atlas.
        vi.spyOn(Consulta, "updateOne").mockRejectedValueOnce(new Error("failover"));
        return {};
      }),
    };
    const r = await responderConsulta(id, "Hola", AUTOR, t);
    expect(r).toMatchObject({ ok: false, error: "registro-fallido" });
    if (!r.ok) expect(r.mensaje).toMatch(/se envió/);
    const doc = await leer(id);
    expect(doc?.seguimiento).toHaveLength(1);
    expect(doc?.seguimiento[0]).toMatchObject({ tipo: "respuesta", texto: "Hola" });
    expect(doc?.seguimiento[0]).not.toHaveProperty("emailEnviado");
  });
});

describe("responderConsulta: la reserva desaparece mientras se envía (hallazgo de /code-review 62)", () => {
  it("si la entrada reservada ya no está al completar, no dice que salió bien: devuelve registro-fallido", async () => {
    const id = await insertar();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t: TransporteEmail = {
      sendMail: vi.fn(async () => {
        await Consulta.collection.updateOne(
          { _id: new mongoose.Types.ObjectId(id) },
          { $set: { seguimiento: [] } },
        );
        return {};
      }),
    };
    const r = await responderConsulta(id, "Hola", AUTOR, t);
    expect(r).toMatchObject({ ok: false, error: "registro-fallido" });
    if (!r.ok) expect(r.mensaje).toMatch(/se envió/);
  });
});

describe("responderConsulta: reintento después de un timeout (#66)", () => {
  // Gmail tarda más que el timeout, pero el envío no se cancela y termina (sale o falla) después.
  function transporteLento(demoraMs: number, falla?: Error) {
    const enviados: SendMailOptions[] = [];
    const t: TransporteEmail = {
      sendMail: (m) => {
        enviados.push(m);
        return new Promise((ok, mal) =>
          setTimeout(() => (falla ? mal(falla) : ok({ messageId: "tarde" })), demoraMs),
        );
      },
    };
    return { t, enviados };
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("antes de que venza la reserva, un segundo intento recibe en-envio y no manda otro email", async () => {
    const id = await insertar();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { t, enviados } = transporteLento(300);
    let tarea: Promise<void> | undefined;
    const seguir = (p: Promise<void>) => {
      tarea = p;
    };
    const primera = await responderConsulta(id, "Primera", AUTOR, t, { timeoutMs: 50, seguir });
    expect(primera).toMatchObject({ ok: false, error: "envio-fallido" });
    if (!primera.ok) expect(primera.mensaje).toMatch(/puede haber llegado/);
    // Mientras el envío sigue, la entrada queda pendiente: la reserva bloquea el reintento.
    const enVuelo = await leer(id);
    expect(enVuelo?.seguimiento[0]).toMatchObject({ tipo: "respuesta", texto: "Primera" });
    expect(enVuelo?.seguimiento[0]).not.toHaveProperty("emailEnviado");

    const segunda = await responderConsulta(id, "Segunda", AUTOR, t, { timeoutMs: 50 });
    expect(segunda).toMatchObject({ ok: false, error: "en-envio" });
    expect(tarea).toBeDefined();
    await tarea;
    // El primer envío salió tarde: el visitante recibe un solo email.
    expect(enviados).toHaveLength(1);
    const doc = await leer(id);
    expect(doc?.seguimiento.filter((e: { tipo: string }) => e.tipo === "respuesta")).toHaveLength(1);
  });

  it("si el envío sale después del timeout, lo registra como enviado y pasa la consulta a respondida", async () => {
    const id = await insertar();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { t } = transporteLento(100);
    let tarea: Promise<void> | undefined;
    await responderConsulta(id, "Hola", AUTOR, t, { timeoutMs: 20, seguir: (p) => (tarea = p) });
    expect(tarea).toBeDefined();
    await tarea;
    const doc = await leer(id);
    expect(doc?.estado).toBe("respondida");
    expect(doc?.seguimiento[0]).toMatchObject({ tipo: "respuesta", emailEnviado: true });
  });

  it("si el envío falla después del timeout, lo registra como no enviado y se puede volver a responder", async () => {
    const id = await insertar();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error(`Invalid login: ${GMAIL_APP_PASSWORD}`), { code: "EAUTH" });
    const { t } = transporteLento(100, error);
    let tarea: Promise<void> | undefined;
    await responderConsulta(id, "Hola", AUTOR, t, { timeoutMs: 20, seguir: (p) => (tarea = p) });
    expect(tarea).toBeDefined();
    await tarea;
    const doc = await leer(id);
    expect(doc?.estado).toBe("en_curso");
    expect(doc?.seguimiento[0]).toMatchObject({ tipo: "respuesta", emailEnviado: false });
    const logueado = log.mock.calls.flat().map(String).join(" ");
    expect(logueado).toContain("EAUTH");
    expect(logueado).not.toContain(GMAIL_APP_PASSWORD);
    const otra = await responderConsulta(id, "Otra", AUTOR, transporteOk().t);
    expect(otra).toMatchObject({ ok: true });
  });

  it("vencida la reserva, se puede volver a responder", async () => {
    const id = await insertar();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // El envío no termina nunca (el proceso se cayó o quedó colgado): solo el vencimiento libera la reserva.
    const colgado: TransporteEmail = { sendMail: () => new Promise(() => {}) };
    const primera = await responderConsulta(id, "Primera", AUTOR, colgado, { timeoutMs: 20 });
    expect(primera).toMatchObject({ ok: false, error: "envio-fallido" });

    // Solo el reloj de `Date`: los timers reales siguen andando para Mongo y el transporte.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + RESERVA_VENCE_MS + 1_000);
    const { t, enviados } = transporteOk();
    const segunda = await responderConsulta(id, "Segunda", AUTOR, t);
    expect(segunda).toMatchObject({ ok: true, estadoCambiado: true });
    expect(enviados).toHaveLength(1);
    const doc = await leer(id);
    expect(doc?.estado).toBe("respondida");
    const respuestas = doc?.seguimiento.filter((e: { tipo: string }) => e.tipo === "respuesta");
    expect(respuestas).toHaveLength(2);
    // La vencida queda sin confirmar (puede haber llegado); la nueva, enviada.
    expect(respuestas?.[0]).not.toHaveProperty("emailEnviado");
    expect(respuestas?.[1]).toMatchObject({ texto: "Segunda", emailEnviado: true });
  });
});

describe("responderConsulta: cabeceras", () => {
  it("los saltos de línea en el nombre o el tipo no generan cabeceras extra", async () => {
    const id = await insertar({
      nombre: "Ada\r\nBcc: espia@example.com",
      tipo: "cotizacion\r\nBcc: espia2@example.com",
    });
    // Transporte real de nodemailer que arma el mensaje crudo sin mandarlo.
    const real = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
    let crudo = "";
    const t: TransporteEmail = {
      sendMail: async (m) => {
        const info = await real.sendMail(m);
        crudo = String(info.message);
        return info;
      },
    };
    const r = await responderConsulta(id, "Hola", AUTOR, t);
    expect(r).toMatchObject({ ok: true });
    const cabeceras = crudo.split("\n\n")[0];
    expect(cabeceras).not.toMatch(/^bcc:/im);
    expect(cabeceras.match(/^to:/gim)).toHaveLength(1);
    expect(cabeceras.match(/^subject:/gim)).toHaveLength(1);
    expect(crudo).not.toMatch(/^Bcc: espia/m);
  });
});

describe("responderConsulta: validaciones", () => {
  it("solo responde una consulta en curso: desde otro estado no envía ni cambia nada", async () => {
    for (const estado of ["nueva", "respondida", "archivada"]) {
      const id = await insertar({ estado });
      const { t, enviados } = transporteOk();
      const r = await responderConsulta(id, "Hola", AUTOR, t);
      expect(r).toMatchObject({ ok: false, error: "estado-invalido" });
      expect(enviados).toHaveLength(0);
      const doc = await leer(id);
      expect(doc?.estado).toBe(estado);
      expect(doc?.seguimiento).toEqual([]);
    }
  });

  it("rechaza una respuesta vacía o de más de 5000 caracteres sin enviar", async () => {
    const id = await insertar();
    for (const texto of ["", "   \n ", "x".repeat(5001), 42, null]) {
      const { t, enviados } = transporteOk();
      expect(await responderConsulta(id, texto, AUTOR, t)).toMatchObject({ ok: false, error: "invalida" });
      expect(enviados).toHaveLength(0);
    }
    // 5000 con saltos CRLF cuentan como LF (lo que cuenta el maxLength del textarea).
    const { t } = transporteOk();
    const largo = "x".repeat(4998) + "\r\nx";
    expect(await responderConsulta(id, largo, AUTOR, t)).toMatchObject({ ok: true });
  });

  it("un id inválido o inexistente devuelve no-encontrada sin enviar", async () => {
    for (const id of ["no-es-un-id", "6528f0c2a1b2c3d4e5f6ffff"]) {
      const { t, enviados } = transporteOk();
      expect(await responderConsulta(id, "Hola", AUTOR, t)).toMatchObject({ ok: false, error: "no-encontrada" });
      expect(enviados).toHaveLength(0);
    }
  });

  it("un destino guardado que no es un email no se envía", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const id = await insertar({ email: "ada@example.com\r\nBcc: espia@example.com" });
    const { t, enviados } = transporteOk();
    const r = await responderConsulta(id, "Hola", AUTOR, t);
    expect(r).toMatchObject({ ok: false, error: "envio-fallido" });
    expect(enviados).toHaveLength(0);
    const doc = await leer(id);
    expect(doc?.estado).toBe("en_curso");
    expect(doc?.seguimiento).toEqual([]);
  });

  it("un autor que no es un id es un error del llamador", async () => {
    const id = await insertar();
    await expect(responderConsulta(id, "Hola", "otro", transporteOk().t)).rejects.toThrow(/autor/);
  });
});
