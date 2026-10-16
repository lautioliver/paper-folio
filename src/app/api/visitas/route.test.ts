import { createHash } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { desconectar } from "@/lib/db";
import { fechaDeVisita } from "@/lib/visitas";
import { VisitaDiaria } from "@/models/VisitaDiaria";
import { VisitanteDiario } from "@/models/VisitanteDiario";

// La ruta no puede importar `@/auth` en Vitest (next-auth no resuelve next/server): se mockea el rol de la sesión.
const rolDeLaSesion = vi.fn();
vi.mock("@/lib/sesion", () => ({
  rolDeLaSesion: (...args: unknown[]) => rolDeLaSesion(...args),
}));

import { POST } from "./route";

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const ID = "3b241101-e2bb-4255-8caf-4136c566a962";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function pedir(cuerpo: unknown, extra: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/visitas", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": CHROME, ...extra },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );
}

/** El valor de `pf_v` en el Set-Cookie, o null si la respuesta no la fija. */
function cookieDe(res: Response): { valor: string; atributos: string } | null {
  const linea = res.headers.getSetCookie().find((c) => c.startsWith("pf_v="));
  if (!linea) return null;
  const [par, ...resto] = linea.split(";");
  return { valor: par.slice("pf_v=".length), atributos: resto.join(";") };
}

let servidor: MongoMemoryServer;

beforeAll(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri();
  process.env.MONGODB_DB = "paperfolio-test";
  await desconectar();
}, 120_000);

beforeEach(async () => {
  rolDeLaSesion.mockResolvedValue(null);
  const { conectar } = await import("@/lib/db");
  await conectar();
  await VisitaDiaria.deleteMany({});
  await VisitanteDiario.deleteMany({});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await desconectar();
  await servidor.stop();
});

describe("POST /api/visitas", () => {
  it("204 sin cuerpo, cuenta la visita y crea la cookie pf_v (HttpOnly, SameSite=Lax, 1 año)", async () => {
    const res = await pedir({ ruta: "/" });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    const cookie = cookieDe(res);
    expect(cookie?.valor).toMatch(UUID);
    expect(cookie?.atributos).toMatch(/HttpOnly/i);
    expect(cookie?.atributos).toMatch(/SameSite=Lax/i);
    expect(cookie?.atributos).toMatch(/Path=\//i);
    expect(cookie?.atributos).toMatch(/Max-Age=31536000/i);
    expect(cookie?.atributos).not.toMatch(/Secure/i);
    expect(await VisitaDiaria.find({}, { _id: 0, fecha: 0 }).lean()).toEqual([{ ruta: "/", total: 1 }]);
    expect(await VisitanteDiario.countDocuments()).toBe(1);
  });

  it("en producción la cookie es Secure", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(cookieDe(await pedir({ ruta: "/" }))?.atributos).toMatch(/Secure/i);
  });

  it("reusa una cookie pf_v válida: no la vuelve a fijar y cuenta un solo único", async () => {
    const res = await pedir({ ruta: "/" }, { cookie: `otra=1; pf_v=${ID}` });
    expect(res.status).toBe(204);
    expect(cookieDe(res)).toBeNull();
    await pedir({ ruta: "/proyectos" }, { cookie: `pf_v=${ID}` });
    const hash = createHash("sha256")
      .update(ID + fechaDeVisita(new Date()))
      .digest("hex");
    expect(await VisitanteDiario.find({}, { _id: 0, fecha: 0 }).lean()).toEqual([{ idHash: hash }]);
  });

  it("reemplaza una cookie pf_v que no es un UUID", async () => {
    const res = await pedir({ ruta: "/" }, { cookie: "pf_v=inventada" });
    expect(cookieDe(res)?.valor).toMatch(UUID);
  });

  it("no cuenta un bot, una ruta del panel ni a un admin, y responde 204", async () => {
    expect((await pedir({ ruta: "/" }, { "user-agent": "Googlebot/2.1" })).status).toBe(204);
    expect((await pedir({ ruta: "/panel/consultas" })).status).toBe(204);
    rolDeLaSesion.mockResolvedValue("admin");
    expect((await pedir({ ruta: "/" })).status).toBe(204);
    expect(await VisitaDiaria.countDocuments()).toBe(0);
    expect(await VisitanteDiario.countDocuments()).toBe(0);
  });

  it("no lee la sesión para un bot ni para una ruta excluida (se descartan antes)", async () => {
    await pedir({ ruta: "/" }, { "user-agent": "Googlebot/2.1" });
    await pedir({ ruta: "/panel" });
    expect(rolDeLaSesion).not.toHaveBeenCalled();
  });

  it("cuenta a un operador o a un usuario con sesión", async () => {
    rolDeLaSesion.mockResolvedValue("operador");
    await pedir({ ruta: "/" });
    rolDeLaSesion.mockResolvedValue("usuario");
    await pedir({ ruta: "/" });
    expect((await VisitaDiaria.findOne().lean())?.total).toBe(2);
  });

  it("400 VISITA_INVALIDA si la ruta no es interna o el cuerpo no es JSON, sin contar", async () => {
    for (const cuerpo of [{ ruta: "https://otro.example/" }, { ruta: "//otro.example" }, {}, "{no es json"]) {
      const res = await pedir(cuerpo);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.codigo).toBe("VISITA_INVALIDA");
      expect(json.error.mensaje).toEqual(expect.any(String));
    }
    expect(await VisitaDiaria.countDocuments()).toBe(0);
  });

  it("415 TIPO_NO_SOPORTADO si no es application/json (un formulario de otro sitio no suma visitas)", async () => {
    const res = await pedir({ ruta: "/" }, { "content-type": "text/plain" });
    expect(res.status).toBe(415);
    expect((await res.json()).error.codigo).toBe("TIPO_NO_SOPORTADO");
    expect(await VisitaDiaria.countDocuments()).toBe(0);
  });

  it("si la base falla responde 204 igual y loguea solo el nombre del error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(VisitaDiaria, "updateOne").mockRejectedValue(
      Object.assign(new Error("connect mongodb://usuario:clave@host"), { name: "MongoNetworkError" }),
    );
    const res = await pedir({ ruta: "/" });
    expect(res.status).toBe(204);
    expect(log).toHaveBeenCalled();
    const logueado = JSON.stringify(log.mock.calls);
    expect(logueado).toContain("MongoNetworkError");
    expect(logueado).not.toContain("clave");
  });

  it("si falla leer el rol de la sesión responde 204 igual", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rolDeLaSesion.mockRejectedValue(new Error("MongoServerSelectionError"));
    expect((await pedir({ ruta: "/" })).status).toBe(204);
  });
});
