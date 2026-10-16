import { createHash } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { desconectar } from "./db";
import { esBot, esquemaVisita, fechaDeVisita, normalizarRuta, registrarVisita, RUTA_OTRA } from "./visitas";
import { VisitaDiaria } from "@/models/VisitaDiaria";
import { VisitanteDiario } from "@/models/VisitanteDiario";

// Los proyectos publicados salen de `listarProyectos` (con `use cache`): acá, uno solo.
vi.mock("./contenido", () => ({ listarProyectos: vi.fn(async () => [{ slug: "paperfolio" }]) }));

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const ID = "3b241101-e2bb-4255-8caf-4136c566a962";
const OTRO_ID = "6fa459ea-ee8a-4ca4-894e-db77e160355e";
// 2026-10-16 10:00 en Salta (UTC-3).
const HOY = new Date("2026-10-16T13:00:00Z");
const MANANA = new Date("2026-10-17T13:00:00Z");

const visita = (extra: Partial<Parameters<typeof registrarVisita>[0]> = {}) => ({
  ruta: "/",
  visitanteId: ID,
  userAgent: CHROME,
  esAdmin: false,
  ...extra,
});

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test";
  await desconectar();
}, 120_000);

beforeEach(async () => {
  const { conectar } = await import("./db");
  await conectar();
  await VisitaDiaria.deleteMany({});
  await VisitanteDiario.deleteMany({});
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

describe("registrarVisita", () => {
  it("dos visitas de la misma ruta el mismo día dan total: 2", async () => {
    expect(await registrarVisita(visita(), HOY)).toBe("contada");
    expect(await registrarVisita(visita({ visitanteId: OTRO_ID }), HOY)).toBe("contada");
    const docs = await VisitaDiaria.find({}, { _id: 0 }).lean();
    expect(docs).toEqual([{ fecha: "2026-10-16", ruta: "/", total: 2 }]);
  });

  it("cuenta aparte cada ruta y cada día", async () => {
    await registrarVisita(visita(), HOY);
    await registrarVisita(visita({ ruta: "/proyectos/paperfolio" }), HOY);
    await registrarVisita(visita(), MANANA);
    const docs = await VisitaDiaria.find({}, { _id: 0 }).sort({ fecha: 1, ruta: 1 }).lean();
    expect(docs).toEqual([
      { fecha: "2026-10-16", ruta: "/", total: 1 },
      { fecha: "2026-10-16", ruta: "/proyectos/paperfolio", total: 1 },
      { fecha: "2026-10-17", ruta: "/", total: 1 },
    ]);
  });

  it("el mismo visitante dos veces el mismo día da un único (y uno por día)", async () => {
    await registrarVisita(visita(), HOY);
    await registrarVisita(visita({ ruta: "/proyectos" }), HOY);
    expect(await VisitanteDiario.countDocuments({ fecha: "2026-10-16" })).toBe(1);
    await registrarVisita(visita({ visitanteId: OTRO_ID }), HOY);
    expect(await VisitanteDiario.countDocuments({ fecha: "2026-10-16" })).toBe(2);
    await registrarVisita(visita(), MANANA);
    expect(await VisitanteDiario.countDocuments({ fecha: "2026-10-17" })).toBe(1);
  });

  it("guarda solo sha256(id + fecha), nunca el id", async () => {
    await registrarVisita(visita(), HOY);
    const docs = await VisitanteDiario.find({}, { _id: 0 }).lean();
    const esperado = createHash("sha256")
      .update(ID + "2026-10-16")
      .digest("hex");
    expect(docs).toEqual([{ fecha: "2026-10-16", idHash: esperado }]);
    expect(JSON.stringify(docs)).not.toContain(ID);
  });

  it("no cuenta un user-agent de bot, una ruta /panel o /api ni un admin", async () => {
    const descartadas = [
      visita({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }),
      visita({ userAgent: "" }),
      visita({ ruta: "/panel" }),
      visita({ ruta: "/panel/consultas" }),
      visita({ ruta: "/api/salud" }),
      visita({ esAdmin: true }),
    ];
    for (const d of descartadas) expect(await registrarVisita(d, HOY)).toBe("descartada");
    expect(await VisitaDiaria.countDocuments()).toBe(0);
    expect(await VisitanteDiario.countDocuments()).toBe(0);
  });

  it("cuenta las rutas fijas y los proyectos publicados con su ruta, y lo demás bajo una sola clave", async () => {
    for (const ruta of ["/", "/proyectos", "/cuenta", "/proyectos/paperfolio"]) await registrarVisita(visita({ ruta }), HOY);
    for (const ruta of ["/a1", "/a2", "/proyectos/no-existe", "/proyectos/paperfolio/demo", "/cuenta/x"]) {
      expect(await registrarVisita(visita({ ruta }), HOY)).toBe("contada");
    }
    const docs = await VisitaDiaria.find({}, { _id: 0, fecha: 0 }).sort({ ruta: 1 }).lean();
    expect(docs).toEqual([
      { ruta: "/", total: 1 },
      { ruta: "/cuenta", total: 1 },
      { ruta: "/proyectos", total: 1 },
      { ruta: "/proyectos/paperfolio", total: 1 },
      { ruta: RUTA_OTRA, total: 5 },
    ]);
  });

  it("guarda la ruta normalizada", async () => {
    await registrarVisita(visita({ ruta: "/proyectos/paperfolio/?ref=x#arriba" }), HOY);
    expect((await VisitaDiaria.findOne().lean())?.ruta).toBe("/proyectos/paperfolio");
  });
});

describe("esBot", () => {
  it("reconoce bots, crawlers, previews y clientes automáticos", () => {
    const bots = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Twitterbot/1.0",
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      "TelegramBot (like TwitterBot)",
      "WhatsApp/2.23.20.0",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
      "curl/8.4.0",
      "Wget/1.21",
      "python-requests/2.31.0",
      "node-fetch/1.0",
      "",
      "   ",
    ];
    for (const ua of bots) expect(esBot(ua), ua).toBe(true);
  });

  it("deja pasar navegadores comunes", () => {
    const personas = [
      CHROME,
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
      // Navegadores dentro de apps: son personas (los bots de esas apps se llaman Discordbot y TelegramBot).
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9184 Chrome/130.0.6723.191 Electron/33.4.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram-iOS/11.2",
    ];
    for (const ua of personas) expect(esBot(ua), ua).toBe(false);
  });
});

describe("normalizarRuta", () => {
  it("saca el query, el hash y la barra final, y deja /proyectos/<slug> tal cual", () => {
    expect(normalizarRuta("/?utm_source=x")).toBe("/");
    expect(normalizarRuta("/proyectos/")).toBe("/proyectos");
    expect(normalizarRuta("/proyectos/mi-slug-2?x=1#a")).toBe("/proyectos/mi-slug-2");
    expect(normalizarRuta("/#contacto")).toBe("/");
  });
});

describe("fechaDeVisita", () => {
  it("es el día en America/Argentina/Salta", () => {
    expect(fechaDeVisita(new Date("2026-10-16T02:59:59Z"))).toBe("2026-10-15");
    expect(fechaDeVisita(new Date("2026-10-16T03:00:00Z"))).toBe("2026-10-16");
  });
});

describe("esquemaVisita", () => {
  it("acepta rutas internas del sitio", () => {
    for (const ruta of ["/", "/proyectos", "/proyectos/paperfolio", "/cuenta?x=1"]) {
      expect(esquemaVisita.safeParse({ ruta }).success, ruta).toBe(true);
    }
  });

  it("rechaza URLs externas, rutas raras o largas y cuerpos sin ruta", () => {
    const malas: unknown[] = [
      { ruta: "https://otro.example/" },
      { ruta: "//otro.example" },
      { ruta: "proyectos" },
      { ruta: "/../etc" },
      { ruta: "/Proyectos/<script>" },
      { ruta: "/" + "a".repeat(300) },
      { ruta: 1 },
      {},
      null,
    ];
    for (const cuerpo of malas) expect(esquemaVisita.safeParse(cuerpo).success, JSON.stringify(cuerpo)).toBe(false);
  });
});
