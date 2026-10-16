import { describe, expect, it } from "vitest";
import { comprobarSesion, decidirIngreso, puedeVerPanel } from "./ingreso";

describe("decidirIngreso", () => {
  it("sin sesión muestra la pantalla con el callbackUrl interno", () => {
    expect(decidirIngreso({ sesion: "ninguna", callbackUrl: "/cuenta" })).toEqual({ accion: "mostrar", aviso: null, callbackUrl: "/cuenta" });
  });

  it("un callbackUrl externo se ignora y lleva a /", () => {
    for (const externo of ["https://otro.sitio", "//otro.sitio", "/\\otro.sitio", "javascript:alert(1)"]) {
      expect(decidirIngreso({ sesion: "ninguna", callbackUrl: externo })).toMatchObject({ callbackUrl: "/" });
      expect(decidirIngreso({ sesion: "valida", callbackUrl: externo })).toEqual({ accion: "redirigir", destino: "/" });
    }
  });

  it("sin callbackUrl o con varios, usa / o ignora el repetido", () => {
    expect(decidirIngreso({ sesion: "valida" })).toEqual({ accion: "redirigir", destino: "/" });
    expect(decidirIngreso({ sesion: "valida", callbackUrl: ["/cuenta", "/panel"] })).toEqual({ accion: "redirigir", destino: "/" });
  });

  it("con sesión válida redirige al callbackUrl interno", () => {
    expect(decidirIngreso({ sesion: "valida", callbackUrl: "/cuenta" })).toEqual({ accion: "redirigir", destino: "/cuenta" });
  });

  it("con error=sesion no redirige aunque la sesión parezca válida", () => {
    expect(decidirIngreso({ sesion: "valida", error: "sesion", callbackUrl: "/cuenta" })).toEqual({
      accion: "mostrar",
      aviso: "sesion",
      callbackUrl: "/cuenta",
    });
  });

  it("una sesión huérfana nunca redirige, con o sin error", () => {
    expect(decidirIngreso({ sesion: "huerfana", callbackUrl: "/cuenta" })).toMatchObject({ accion: "mostrar", aviso: "sesion" });
    expect(decidirIngreso({ sesion: "huerfana", error: "sesion" })).toMatchObject({ accion: "mostrar", aviso: "sesion" });
  });

  it("error=sesion sin ninguna sesión muestra la pantalla normal", () => {
    expect(decidirIngreso({ sesion: "ninguna", error: "sesion" })).toEqual({ accion: "mostrar", aviso: null, callbackUrl: "/" });
  });
});

describe("puedeVerPanel", () => {
  it("solo operador y admin", () => {
    expect(puedeVerPanel("usuario")).toBe(false);
    expect(puedeVerPanel("operador")).toBe(true);
    expect(puedeVerPanel("admin")).toBe(true);
    expect(puedeVerPanel(null)).toBe(false);
    expect(puedeVerPanel(undefined)).toBe(false);
  });
});

describe("decidirIngreso con la base caída", () => {
  it("con sesión sin verificar no redirige ni da error: avisa", () => {
    expect(decidirIngreso({ sesion: "error", callbackUrl: "/cuenta" })).toEqual({
      accion: "mostrar",
      aviso: "verificacion",
      callbackUrl: "/cuenta",
    });
  });
});

describe("comprobarSesion", () => {
  const sesion = { user: { id: "u1", rol: "usuario" as const } };
  it("sin sesión → ninguna", async () => {
    expect(await comprobarSesion(null, async () => "usuario")).toBe("ninguna");
  });
  it("usuario en la base → valida", async () => {
    expect(await comprobarSesion(sesion, async () => "usuario")).toBe("valida");
  });
  it("usuario que ya no está → huerfana", async () => {
    expect(await comprobarSesion(sesion, async () => null)).toBe("huerfana");
  });
  it("si la base falla → error, sin lanzar", async () => {
    const caida = async () => {
      throw new Error("MongoServerSelectionError");
    };
    expect(await comprobarSesion(sesion, caida)).toBe("error");
  });
});

describe("cuenta bloqueada (#49)", () => {
  const sesion = { user: { id: "b1", rol: "admin" as const } };
  it("comprobarSesion → bloqueada", async () => {
    expect(await comprobarSesion(sesion, async () => "bloqueado")).toBe("bloqueada");
  });
  it("decidirIngreso no redirige: avisa que está bloqueada", () => {
    expect(decidirIngreso({ sesion: "bloqueada", callbackUrl: "/panel" })).toEqual({
      accion: "mostrar",
      aviso: "bloqueada",
      callbackUrl: "/panel",
    });
  });
  it("si la desbloquearon (la base dice válida), error=bloqueado no la frena", () => {
    expect(decidirIngreso({ sesion: "valida", error: "bloqueado", callbackUrl: "/panel" })).toEqual({
      accion: "redirigir",
      destino: "/panel",
    });
  });
});

describe("ingreso rechazado por Auth.js (error=AccessDenied, code-review)", () => {
  it("sin sesión avisa que no pudo ingresar (cuenta bloqueada o sin verificar), sin redirigir", () => {
    expect(decidirIngreso({ sesion: "ninguna", error: "AccessDenied", callbackUrl: "/cuenta" })).toEqual({
      accion: "mostrar",
      aviso: "denegado",
      callbackUrl: "/cuenta",
    });
  });
});

describe("errores del ingreso en /ingresar (revisión del PR #69)", () => {
  const mostrar = (error: string | string[] | undefined) => decidirIngreso({ sesion: "ninguna", error, callbackUrl: "/cuenta" });

  it("error=bloqueado sin sesión (signIn de una cuenta bloqueada, o un link armado) avisa, pero deja ingresar con otra cuenta", () => {
    // "bloqueada" (solo "Salir") queda para cuando la base dice que la sesión actual está bloqueada.
    expect(mostrar("bloqueado")).toEqual({ accion: "mostrar", aviso: "ingreso-bloqueado", callbackUrl: "/cuenta" });
  });

  it("error=reintentar (la base no respondió en signIn) pide reintentar, sin culpar a la cuenta", () => {
    expect(mostrar("reintentar")).toEqual({ accion: "mostrar", aviso: "reintentar", callbackUrl: "/cuenta" });
  });

  it("cualquier otro código de Auth.js muestra un aviso genérico (nunca el texto crudo)", () => {
    for (const codigo of ["Configuration", "OAuthCallbackError", "<script>", "toString"]) {
      expect(mostrar(codigo)).toEqual({ accion: "mostrar", aviso: "generico", callbackUrl: "/cuenta" });
    }
  });

  it("sin error, con error=sesion o repetido, la pantalla normal", () => {
    expect(mostrar(undefined)).toMatchObject({ aviso: null });
    expect(mostrar("sesion")).toMatchObject({ aviso: null });
    expect(mostrar(["Configuration", "x"])).toMatchObject({ aviso: null });
  });
});
