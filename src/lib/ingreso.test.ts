import { describe, expect, it } from "vitest";
import { comprobarSesion, decidirIngreso, puedeVerPanel, rutaDeCookieDeVuelta } from "./ingreso";

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

  it("un código desconocido muestra un aviso genérico (nunca el texto crudo)", () => {
    for (const codigo of ["CredentialsSignin", "<script>", "toString", "__proto__"]) {
      expect(mostrar(codigo)).toEqual({ accion: "mostrar", aviso: "generico", callbackUrl: "/cuenta" });
    }
  });

  it("sin error o con error=sesion, la pantalla normal", () => {
    expect(mostrar(undefined)).toMatchObject({ aviso: null });
    expect(mostrar("sesion")).toMatchObject({ aviso: null });
  });
});

describe("errores de Auth.js en /ingresar (#45)", () => {
  const mostrar = (error: string | string[] | undefined) => decidirIngreso({ sesion: "ninguna", error, callbackUrl: "/cuenta" });

  it("cada código conocido de Auth.js tiene su aviso", () => {
    const esperado: Record<string, string | null> = {
      AccessDenied: "denegado",
      OAuthCallbackError: "google",
      OAuthSignin: "google",
      Callback: "google",
      Signin: "google",
      OAuthCreateAccount: "google",
      Configuration: "configuracion",
      Verification: "vencido",
      MissingCSRF: "vencido",
      OAuthAccountNotLinked: "cuenta-no-vinculada",
      AccountNotLinked: "cuenta-no-vinculada",
      SessionRequired: null,
    };
    for (const [codigo, aviso] of Object.entries(esperado)) {
      expect(mostrar(codigo), codigo).toEqual({ accion: "mostrar", aviso, callbackUrl: "/cuenta" });
    }
  });

  it("un error repetido en la query (?error=a&error=b) muestra el genérico, no la pantalla sin aviso", () => {
    expect(mostrar(["Configuration", "x"])).toMatchObject({ aviso: "generico" });
    expect(mostrar(["sesion", "sesion"])).toMatchObject({ aviso: "generico" });
  });

  it("un callbackUrl que no es string o es externo lleva a /", () => {
    for (const callbackUrl of [["/cuenta"], 42, { a: 1 }, null, "https://otro.sitio/x", "//otro.sitio"]) {
      const entrada = { sesion: "ninguna" as const, error: "AccessDenied", callbackUrl: callbackUrl as unknown as string };
      expect(decidirIngreso(entrada), JSON.stringify(callbackUrl)).toMatchObject({ callbackUrl: "/" });
      expect(decidirIngreso({ ...entrada, sesion: "valida", error: undefined })).toEqual({ accion: "redirigir", destino: "/" });
    }
  });

  it("con un error y sin callbackUrl en la query, vuelve a la ruta que Auth.js guardó al empezar el ingreso", () => {
    // signIn (bloqueado, reintentar) y Auth.js (AccessDenied, Configuration…) mandan a /ingresar sin el callbackUrl.
    for (const error of ["bloqueado", "reintentar", "AccessDenied", "Configuration", "OAuthCallbackError"]) {
      expect(decidirIngreso({ sesion: "ninguna", error, vueltaGuardada: "/proyectos/a" }), error).toMatchObject({
        accion: "mostrar",
        callbackUrl: "/proyectos/a",
      });
    }
    // Si en el medio quedó con sesión (la desbloquearon), redirige ahí.
    expect(decidirIngreso({ sesion: "valida", error: "bloqueado", vueltaGuardada: "/proyectos/a" })).toEqual({
      accion: "redirigir",
      destino: "/proyectos/a",
    });
  });

  it("la ruta guardada no pisa un callbackUrl de la query (ni uno inválido) y sin error no se usa", () => {
    expect(decidirIngreso({ sesion: "ninguna", error: "AccessDenied", callbackUrl: "/cuenta", vueltaGuardada: "/proyectos/a" })).toMatchObject({
      callbackUrl: "/cuenta",
    });
    expect(
      decidirIngreso({ sesion: "ninguna", error: "AccessDenied", callbackUrl: "https://otro.sitio", vueltaGuardada: "/proyectos/a" }),
    ).toMatchObject({ callbackUrl: "/" });
    expect(decidirIngreso({ sesion: "ninguna", vueltaGuardada: "/proyectos/a" })).toMatchObject({ callbackUrl: "/" });
    expect(decidirIngreso({ sesion: "valida", vueltaGuardada: "/proyectos/a" })).toEqual({ accion: "redirigir", destino: "/" });
  });

  it("una ruta guardada externa se ignora aunque llegue a decidirIngreso", () => {
    expect(decidirIngreso({ sesion: "ninguna", error: "AccessDenied", vueltaGuardada: "//otro.sitio" })).toMatchObject({ callbackUrl: "/" });
  });
});

describe("rutaDeCookieDeVuelta (la cookie callback-url de Auth.js, #45)", () => {
  it("de la URL absoluta que guarda Auth.js se queda con la ruta interna, con su query", () => {
    expect(rutaDeCookieDeVuelta("http://localhost:3000/proyectos/a?b=1#c")).toBe("/proyectos/a?b=1#c");
    expect(rutaDeCookieDeVuelta("https://paperfolio.vercel.app/panel/consultas")).toBe("/panel/consultas");
    expect(rutaDeCookieDeVuelta("/cuenta")).toBe("/cuenta");
  });

  it("nunca devuelve algo que lleve a otro sitio, ni lo que no es una URL http", () => {
    for (const valor of [undefined, null, 42, "", "no es una url", "javascript:alert(1)", "https://otro.sitio//x.com", "//otro.sitio", "/\\otro.sitio", "data:text/html,hola"]) {
      expect(rutaDeCookieDeVuelta(valor), String(valor)).toBeUndefined();
    }
  });
});
