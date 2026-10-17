import { describe, expect, it } from "vitest";
import { AVISOS_SIN_SESION, comprobarSesion, decidirIngreso, puedeVerPanel } from "./ingreso";

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

  it("ya no vuelve a la ruta de la cookie de Auth.js: con o sin sesión, el destino es el callbackUrl o / (decisión de @lautioliver en el PR #73)", () => {
    // decidirIngreso ya no recibe la ruta guardada: si alguien la pasa, se ignora.
    const conVuelta = (entrada: Parameters<typeof decidirIngreso>[0], vuelta: string) =>
      decidirIngreso({ ...entrada, vueltaGuardada: vuelta } as Parameters<typeof decidirIngreso>[0]);
    for (const error of ["bloqueado", "reintentar", "AccessDenied", "Configuration", "OAuthCallbackError"]) {
      expect(conVuelta({ sesion: "ninguna", error }, "/proyectos/a"), error).toMatchObject({ accion: "mostrar", callbackUrl: "/" });
      expect(conVuelta({ sesion: "valida", error }, "/api/auth/error?error=AccessDenied"), error).toEqual({ accion: "redirigir", destino: "/" });
    }
  });
});

describe("ningún destino vuelve a /ingresar (revisión del PR #73: bucle de redirecciones)", () => {
  // Variantes de /ingresar: Next redirige la barra final y resuelve "." y los %XX, así que todas terminan ahí.
  const aIngresar = [
    "/ingresar",
    "/ingresar?error=AccessDenied",
    "/ingresar?error=bloqueado&callbackUrl=%2Fcuenta",
    "/ingresar/",
    "/ingresar/?error=AccessDenied",
    "/INGRESAR?error=AccessDenied",
    "/Ingresar",
    "/ingresar%2F?error=AccessDenied",
    "/%69ngresar?error=AccessDenied",
    "/./ingresar?error=AccessDenied",
    "/proyectos/../ingresar?error=AccessDenied",
    "/ingresar#x",
  ];

  it("un callbackUrl de la query que apunta a /ingresar también lleva a /", () => {
    for (const callbackUrl of aIngresar) {
      expect(decidirIngreso({ sesion: "valida", callbackUrl }), callbackUrl).toEqual({ accion: "redirigir", destino: "/" });
      expect(decidirIngreso({ sesion: "ninguna", error: "AccessDenied", callbackUrl }), callbackUrl).toMatchObject({ callbackUrl: "/" });
    }
  });

  it("rutas que solo se parecen siguen valiendo", () => {
    for (const ruta of ["/ingresarx", "/proyectos/ingresar", "/cuenta?volver=/ingresar", "/apix", "/proyectos/api", "/cuenta?desde=/api/x"]) {
      expect(decidirIngreso({ sesion: "valida", callbackUrl: ruta }), ruta).toEqual({ accion: "redirigir", destino: ruta });
    }
  });
});

describe("aviso de Configuration (decisión de @lautioliver en el PR #73)", () => {
  it("ofrece reintentar y no culpa a la persona: el problema es del sitio", () => {
    expect(AVISOS_SIN_SESION.configuracion.boton).toBe("google");
    expect(AVISOS_SIN_SESION.configuracion.texto).toBe("Hubo un problema de nuestro lado al iniciar sesión. Probá de nuevo en un rato.");
  });
});

describe("ningún destino bajo /api/ (segunda revisión del PR #73: bucle por las rutas de Auth.js)", () => {
  // /api/auth/error, /api/auth/callback/google y /api/auth/signin/google vuelven a /ingresar?error=… sin callbackUrl.
  const aApi = [
    "/api/auth/error?error=AccessDenied",
    "/api/auth/callback/google",
    "/api/auth/signin/google",
    "/api",
    "/api/",
    "/API/auth/error",
    "/%61pi/auth/error",
    "/./api/auth/error",
    "/.//api/auth/error",
    "/x/..//api/auth/error",
  ];

  it("un callbackUrl a /api/… lleva a /, con o sin sesión", () => {
    for (const callbackUrl of aApi) {
      expect(decidirIngreso({ sesion: "valida", error: "AccessDenied", callbackUrl }), callbackUrl).toEqual({ accion: "redirigir", destino: "/" });
      expect(decidirIngreso({ sesion: "ninguna", error: "Configuration", callbackUrl }), callbackUrl).toMatchObject({ callbackUrl: "/" });
    }
  });
});

describe("un destino con ?, # o \\ codificados en el camino no sirve (code-review del PR #73)", () => {
  it("no se puede esconder /ingresar ni /api/ detrás de un %3F, %23 o %5C", () => {
    for (const callbackUrl of ["/x%3F/..%2Fingresar", "/x%23/..%2Fapi/auth/signout", "/%5Cingresar", "/proyectos%5C..%5Capi"]) {
      expect(decidirIngreso({ sesion: "valida", callbackUrl }), callbackUrl).toEqual({ accion: "redirigir", destino: "/" });
    }
  });

  it("una query con esos caracteres sigue valiendo", () => {
    expect(decidirIngreso({ sesion: "valida", callbackUrl: "/proyectos?q=a%3Fb%23c" })).toEqual({ accion: "redirigir", destino: "/proyectos?q=a%3Fb%23c" });
  });
});

describe("la cookie de Auth.js ya no se lee (decisión de @lautioliver en el PR #73)", () => {
  it("ingreso no expone nada para leerla", async () => {
    expect(Object.keys(await import("./ingreso"))).not.toContain("rutaDeCookieDeVuelta");
  });
});
