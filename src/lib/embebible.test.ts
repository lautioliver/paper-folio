import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `use cache` no corre en Vitest (es una directiva de Next): se espían cacheLife y cacheTag.
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

import { cacheLife, cacheTag } from "next/cache";
import { TAG_CONTENIDO } from "./contenido";
import { consultarEmbebible, demoEmbebible, origenDelSitio, permiteEmbeber } from "./embebible";

const SITIO = "https://paper-folio.vercel.app";
const DEMO = "https://ucanode.app/";

function cabeceras(pares: [string, string][]): Headers {
  const h = new Headers();
  for (const [nombre, valor] of pares) h.append(nombre, valor);
  return h;
}

const permite = (pares: [string, string][], demo = DEMO, sitio = SITIO) => permiteEmbeber(cabeceras(pares), sitio, demo);

describe("permiteEmbeber: X-Frame-Options", () => {
  it("sin cabeceras se deja embeber", () => {
    expect(permite([])).toBe(true);
  });

  it("DENY no se deja embeber, en cualquier combinación de mayúsculas y con espacios", () => {
    expect(permite([["X-Frame-Options", "DENY"]])).toBe(false);
    expect(permite([["x-frame-options", "deny"]])).toBe(false);
    expect(permite([["X-Frame-Options", "  Deny "]])).toBe(false);
  });

  it("SAMEORIGIN no se deja embeber desde otro origen, sí desde el mismo", () => {
    expect(permite([["X-Frame-Options", "SAMEORIGIN"]])).toBe(false);
    expect(permite([["X-Frame-Options", "sameorigin"]], `${SITIO}/demo`)).toBe(true);
  });

  it("cabeceras repetidas: iguales cuentan como una, distintas con una conocida bloquean", () => {
    expect(permite([["X-Frame-Options", "DENY"], ["X-Frame-Options", "deny"]])).toBe(false);
    expect(permite([["X-Frame-Options", "SAMEORIGIN"], ["X-Frame-Options", "DENY"]])).toBe(false);
    expect(permite([["X-Frame-Options", "SAMEORIGIN, ALLOWALL"]], `${SITIO}/demo`)).toBe(false);
  });

  it("valores que los navegadores ignoran no bloquean", () => {
    expect(permite([["X-Frame-Options", "ALLOWALL"]])).toBe(true);
    expect(permite([["X-Frame-Options", "ALLOW-FROM https://paper-folio.vercel.app"]])).toBe(true);
    expect(permite([["X-Frame-Options", "foo, bar"]])).toBe(true);
    expect(permite([["X-Frame-Options", ""]])).toBe(true);
  });
});

describe("permiteEmbeber: CSP frame-ancestors", () => {
  const csp = (valor: string, demo = DEMO) => permite([["Content-Security-Policy", valor]], demo);

  it("'none' y la directiva vacía no se dejan embeber", () => {
    expect(csp("frame-ancestors 'none'")).toBe(false);
    expect(csp("default-src 'self'; frame-ancestors")).toBe(false);
  });

  it("'self' solo deja embeber desde el mismo origen de la demo", () => {
    expect(csp("frame-ancestors 'self'")).toBe(false);
    expect(csp("frame-ancestors 'self'", `${SITIO}/x`)).toBe(true);
  });

  it("* deja embeber", () => {
    expect(csp("frame-ancestors *")).toBe(true);
  });

  it("una lista de orígenes deja embeber solo si incluye el del sitio", () => {
    expect(csp("frame-ancestors 'self' https://paper-folio.vercel.app")).toBe(true);
    expect(csp("frame-ancestors https://otro.example https://tercero.example")).toBe(false);
    expect(csp("frame-ancestors paper-folio.vercel.app")).toBe(true);
    expect(csp("frame-ancestors https://*.vercel.app")).toBe(true);
    expect(csp("frame-ancestors https://*.paper-folio.vercel.app")).toBe(false);
    expect(csp("frame-ancestors https://paper-folio.vercel.app:443/alguna/ruta")).toBe(true);
    expect(csp("frame-ancestors https://paper-folio.vercel.app:8443")).toBe(false);
    expect(csp("frame-ancestors https://paper-folio.vercel.app:*")).toBe(true);
    expect(csp("frame-ancestors http://paper-folio.vercel.app")).toBe(true);
  });

  it("un esquema solo deja embeber si coincide con el del sitio", () => {
    expect(csp("frame-ancestors https:")).toBe(true);
    expect(csp("frame-ancestors wss:")).toBe(false);
  });

  it("no distingue mayúsculas en la directiva ni en las fuentes", () => {
    expect(csp("FRAME-ANCESTORS 'NONE'")).toBe(false);
    expect(csp("Frame-Ancestors HTTPS://PAPER-FOLIO.VERCEL.APP")).toBe(true);
  });

  it("frame-ancestors manda sobre X-Frame-Options", () => {
    expect(
      permite([
        ["X-Frame-Options", "DENY"],
        ["Content-Security-Policy", "frame-ancestors https://paper-folio.vercel.app"],
      ]),
    ).toBe(true);
  });

  it("una CSP sin frame-ancestors no anula X-Frame-Options", () => {
    expect(
      permite([
        ["X-Frame-Options", "DENY"],
        ["Content-Security-Policy", "default-src 'self'"],
      ]),
    ).toBe(false);
  });

  it("con varias políticas, todas tienen que dejar embeber", () => {
    expect(
      permite([
        ["Content-Security-Policy", "frame-ancestors *"],
        ["Content-Security-Policy", "frame-ancestors 'none'"],
      ]),
    ).toBe(false);
    expect(csp("frame-ancestors *, frame-ancestors https://otro.example")).toBe(false);
    expect(csp("frame-ancestors *, default-src 'self'")).toBe(true);
  });

  it("solo cuenta la primera frame-ancestors de una política", () => {
    expect(csp("frame-ancestors *; frame-ancestors 'none'")).toBe(true);
  });

  it("la política solo informada (Report-Only) no bloquea", () => {
    expect(permite([["Content-Security-Policy-Report-Only", "frame-ancestors 'none'"]])).toBe(true);
  });
});

describe("origenDelSitio", () => {
  it("usa el dominio de producción de Vercel", () => {
    expect(origenDelSitio({ VERCEL_PROJECT_PRODUCTION_URL: "paper-folio.vercel.app" })).toBe(SITIO);
  });

  it("sin Vercel, el de desarrollo", () => {
    expect(origenDelSitio({})).toBe("http://localhost:3000");
  });
});

type Respuesta = { status?: number; headers?: [string, string][]; body?: ReadableStream | null };

function respuesta({ status = 200, headers = [], body = null }: Respuesta): Response {
  return new Response(body, { status, headers: cabeceras(headers) });
}

function fetchFalso(...respuestas: Respuesta[]) {
  const cola = [...respuestas];
  return vi.fn<typeof fetch>(async () => {
    const siguiente = cola.shift();
    if (!siguiente) throw new Error("sin respuesta");
    return respuesta(siguiente);
  });
}

describe("consultarEmbebible", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pide solo las cabeceras (HEAD), sin seguir redirects solo y con un límite de tiempo", async () => {
    const f = fetchFalso({ headers: [["X-Frame-Options", "DENY"]] });
    expect(await consultarEmbebible(DEMO, SITIO, { fetch: f })).toBe("no");
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toBe(DEMO);
    expect(init?.method).toBe("HEAD");
    expect(init?.redirect).toBe("manual");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.credentials).toBe("omit");
  });

  it("sin cabeceras que lo impidan, se deja embeber", async () => {
    expect(await consultarEmbebible(DEMO, SITIO, { fetch: fetchFalso({}) })).toBe("si");
  });

  it("si el servidor no acepta HEAD, prueba con GET y no lee el cuerpo", async () => {
    let leido = false;
    const cancel = vi.fn();
    // highWaterMark 0: el stream no se llena solo, así `pull` marca una lectura de verdad.
    const body = new ReadableStream(
      {
        pull() {
          leido = true;
        },
        cancel,
      },
      { highWaterMark: 0 },
    );
    const f = fetchFalso({ status: 405 }, { headers: [["Content-Security-Policy", "frame-ancestors 'none'"]], body });
    expect(await consultarEmbebible(DEMO, SITIO, { fetch: f })).toBe("no");
    expect(f.mock.calls[1][1]?.method).toBe("GET");
    expect(cancel).toHaveBeenCalled();
    expect(leido).toBe(false);
  });

  it("sigue redirects https (relativos o a otro host) y mira la respuesta final", async () => {
    const f = fetchFalso(
      { status: 301, headers: [["Location", "/inicio"]] },
      { status: 302, headers: [["Location", "https://www.ucanode.app/"]] },
      { headers: [["X-Frame-Options", "DENY"]] },
    );
    expect(await consultarEmbebible(DEMO, SITIO, { fetch: f })).toBe("no");
    expect(f.mock.calls.map(([u]) => String(u))).toEqual([
      DEMO,
      "https://ucanode.app/inicio",
      "https://www.ucanode.app/",
    ]);
  });

  it("un redirect a otro esquema, o demasiados redirects, no se sigue", async () => {
    const http = fetchFalso({ status: 301, headers: [["Location", "http://ucanode.app/"]] });
    expect(await consultarEmbebible(DEMO, SITIO, { fetch: http })).toBe("desconocido");
    expect(http).toHaveBeenCalledTimes(1);

    const bucle = vi.fn(async () => respuesta({ status: 302, headers: [["Location", DEMO]] }));
    expect(await consultarEmbebible(DEMO, SITIO, { fetch: bucle })).toBe("desconocido");
    expect(bucle.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it("no consulta URLs que no son https, con credenciales, a IPs, a localhost o a otro puerto", async () => {
    const f = fetchFalso({});
    for (const url of [
      "http://ucanode.app",
      "https://usuario:clave@ucanode.app",
      "https://usuario@ucanode.app",
      "https://127.0.0.1",
      "https://169.254.169.254/latest",
      "https://[::1]/",
      "https://localhost",
      "https://algo.localhost",
      "https://ucanode.app:8443",
      "no es una url",
    ]) {
      expect(await consultarEmbebible(url, SITIO, { fetch: f })).toBe("desconocido");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("si la consulta falla, no sabe; el aviso no lleva la ruta ni la query", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await consultarEmbebible("https://ucanode.app/secreto?token=abc", SITIO, { fetch: f })).toBe("desconocido");
    const mensajes = warn.mock.calls.map((c: unknown[]) => c.join(" ")).join("\n");
    expect(mensajes).not.toContain("secreto");
    expect(mensajes).not.toContain("token");
  });

  it("si tarda más del límite, corta y no sabe", async () => {
    const f = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, rechazar) => {
          init?.signal?.addEventListener("abort", () => rechazar(init.signal?.reason));
        }),
    );
    const inicio = Date.now();
    expect(await consultarEmbebible(DEMO, SITIO, { fetch: f, timeoutMs: 30 })).toBe("desconocido");
    expect(Date.now() - inicio).toBeLessThan(1000);
  });
});

describe("demoEmbebible (cacheada)", () => {
  beforeEach(() => {
    vi.mocked(cacheLife).mockClear();
    vi.mocked(cacheTag).mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("se invalida con el contenido y guarda el resultado por horas", async () => {
    vi.stubGlobal("fetch", fetchFalso({ headers: [["X-Frame-Options", "DENY"]] }));
    expect(await demoEmbebible(DEMO, SITIO)).toBe("no");
    expect(cacheTag).toHaveBeenCalledWith(TAG_CONTENIDO);
    expect(cacheLife).toHaveBeenLastCalledWith("hours");
  });

  it("si no pudo saberlo, lo guarda por minutos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    expect(await demoEmbebible(DEMO, SITIO)).toBe("desconocido");
    expect(cacheTag).toHaveBeenCalledWith(TAG_CONTENIDO);
    expect(cacheLife).toHaveBeenLastCalledWith("minutes");
  });
});
