import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PREFIJOS_PROTEGIDOS, redireccionDeProxy } from "./proteccion";

describe("redireccionDeProxy", () => {
  it("sin sesión, el detalle de un proyecto redirige a /ingresar con callbackUrl", () => {
    expect(redireccionDeProxy("/proyectos/ucanode", false)).toBe("/ingresar?callbackUrl=%2Fproyectos%2Fucanode");
  });

  it("con sesión deja pasar", () => {
    expect(redireccionDeProxy("/proyectos/ucanode", true)).toBeNull();
  });

  it("el listado /proyectos y el resto del sitio son públicos", () => {
    for (const ruta of ["/", "/proyectos", "/proyectos/", "/ingresar", "/api/auth/session"]) {
      expect(redireccionDeProxy(ruta, false), ruta).toBeNull();
    }
  });

  it("protege cualquier ruta bajo /proyectos/, también con barra final o subrutas", () => {
    expect(redireccionDeProxy("/proyectos/ucanode/", false)).not.toBeNull();
    expect(redireccionDeProxy("/proyectos/a/b", false)).not.toBeNull();
  });

  it("no se deja engañar por prefijos parecidos", () => {
    expect(redireccionDeProxy("/proyectosx/ucanode", false)).toBeNull();
  });
});

describe("matcher de proxy.ts", () => {
  // No se puede importar `@/proxy` en Vitest: arrastra next-auth, que no resuelve `next/server`. Se lee el
  // fuente (ruta relativa a este archivo, no al cwd) sin comentarios y se extrae el literal de `matcher`.
  it("cubre cada prefijo de PREFIJOS_PROTEGIDOS (si no, el proxy no corre y la redirección rápida se pierde)", () => {
    const fuente = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const literal = /matcher:\s*\[([^\]]*)\]/.exec(fuente)?.[1] ?? "";
    const matcher = [...literal.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(matcher.sort()).toEqual(PREFIJOS_PROTEGIDOS.map((prefijo) => `${prefijo}:path+`).sort());
  });
});

describe("proxy en el panel", () => {
  it("sin sesión, /panel/consultas redirige a /ingresar con callbackUrl", () => {
    expect(redireccionDeProxy("/panel/consultas", false)).toBe("/ingresar?callbackUrl=%2Fpanel%2Fconsultas");
  });

  it("con sesión deja pasar (el rol lo controla la página con requerirRol)", () => {
    expect(redireccionDeProxy("/panel/consultas", true)).toBeNull();
  });
});
